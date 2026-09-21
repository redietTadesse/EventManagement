# Software Design Document — Workflow Engine

Module: `com.aicc.eventmanagement.services.WorkflowEngine`
Status: Implemented (see `WorkflowEngineTest` for executable specification)

## Overview

The workflow engine is the single authority for event lifecycle transitions. It owns:

- the **transition table** (`Map<EventStatus, Set<EventStatus>>`) — which status changes are legal;
- the **transition role map** (`Map<String, Set<Role>>`) — which roles may perform each legal change;
- **startup invariant checks** (`@PostConstruct init()`) — which make table/role-map drift fail at boot rather than at runtime.

Status changes elsewhere in the codebase must go through
`WorkflowEngine.validateTransition(from, to, userRole)`, which throws
`IllegalStateException` for an illegal transition and `SecurityException` when the
role is not authorized.

## State machine

```
INQUIRY_SUBMITTED ──► PROPOSAL_SENT ──► PROPOSAL_ACCEPTED ──► EVENT_CREATED
        │                    │                                        │
        │                    └──────────► PROPOSAL_REJECTED ──► CLOSED│
        ▼                                                             ▼
      CLOSED                                    ┌──► AWAITING_VENDORS ──┐
                                                │                      ▼
 EVENT_CREATED ──► NEEDS_COORDINATOR ───────────┤                  CONFIRMED ──► COMPLETED
                                                │                      │
                                                └──────────────────────┴──► CANCELLED
```

Every non-terminal state has at least one outgoing transition; terminal states have none.

## Event-level rollup

Individual category assignments never set the event status directly. `VendorService`
re-derives it from the per-category assignment states in the private method
`evaluateEventRollup(Event event, Role triggeringRole)`:

| Condition (over the event type's required categories) | Rollup target |
|---|---|
| **Any category stuck** — no assignment at all, or its latest assignment is `DECLINED`, `OPEN`, or `CANCELLED` | `NEEDS_COORDINATOR` |
| **All categories accepted** — every category has an `ACCEPTED` (or `COMPLETED`) assignment | `CONFIRMED` |
| **Otherwise** — at least one category still `PENDING` | `AWAITING_VENDORS` |

The policy is deliberately **fail-fast, all-or-nothing**: a single stuck category is enough
to pull the event back to `NEEDS_COORDINATOR`, and `CONFIRMED` requires *every* required
category to be accepted — a merely `PENDING` category is not sufficient. "Latest
assignment" means the highest `id` for that category, so a re-assignment created by
`autoReassign` always supersedes the declined assignment it replaces. The rollup is a
no-op from `CONFIRMED`, `COMPLETED`, `CANCELLED`, and `CLOSED`, and it forwards
`triggeringRole` to `WorkflowEngine.validateTransition`, so the actor that caused the
change must be authorized for the resulting transition.

The rollup is invoked from every action that can change a category's state:

| Action | Triggering role |
|---|---|
| `autoAssignForEvent` | COORDINATOR |
| `manualAssign` | COORDINATOR |
| `forceAssignToOpenAssignment` | COORDINATOR |
| `respondToAssignment` (accept **or** decline) | VENDOR |
| `claimOpenAssignment` | VENDOR |

`autoReassign` deliberately does **not** set the event status. When a decline exhausts the
ranked vendor list, it opens the declined assignment (`DECLINED → OPEN`) and records the
category in `Event.unfilledCategories`; the event-level consequence is then decided by the
rollup that runs immediately afterwards. This is what makes `DECLINED → OPEN` reachable —
previously a dead check for `PENDING` status meant the assignment was never opened at all.

Executable specification: `EventRollupTest` (`src/test/java/.../integration/`).

## Terminal state invariants

`COMPLETED`, `CANCELLED`, and `CLOSED` are terminal (`EventStatus.isTerminal()`). This is not a
convention — it is asserted at startup in `init()`:

1. **Terminal states must not have outgoing transitions.** If a terminal state gains an entry in
   the transition table, the application fails to start with `IllegalStateException`.
2. **Every non-terminal state must declare at least one outgoing transition.** A dead-end active
   state would trap events; the application fails to start.
3. **Every transition listed must have a role map entry.** Adding a transition to the table and
   forgetting the role map previously surfaced as a runtime `SecurityException` (null
   `allowedRoles`) only when the transition was first exercised. The startup check makes the
   mistake fail fast and loudly, so the transition table and the role map cannot drift apart.

These checks run on every application start (`@PostConstruct`) and are re-verified in tests via
`everyTransitionHasRoleMap` (fresh `init()` must not throw).

### The same three invariants cover the assignment table

`init()` applies the identical three checks to `assignmentTransitionTable` /
`assignmentTransitionRoleMap`, using `VendorAssignmentStatus.isTerminal()`. The two tables
therefore cannot drift apart either, and the same "add the transition, forget the role map"
mistake fails at boot for assignments as well.

The split of terminal vs non-terminal for assignments is:

| State | Terminal? | Why |
|---|---|---|
| `PENDING` | no | Can be accepted or declined |
| `DECLINED` | **no** | Can be reopened to the pool (`DECLINED → OPEN`) |
| `OPEN` | no | Can be claimed (`OPEN → PENDING`) or cancelled |
| `ACCEPTED` | yes | The vendor is committed |
| `COMPLETED` | yes | Work is done |
| `CANCELLED` | yes | Reachable only from `OPEN` |

`DECLINED` being non-terminal is the subtle one: if it were declared terminal, `init()` would
reject the `DECLINED → OPEN` transition at startup. `assignmentTableInvariantsHold` pins this.

## Cancellation semantics

Cancellation is available once vendor coordination has begun. `AWAITING_VENDORS`,
`NEEDS_COORDINATOR`, and `CONFIRMED` can transition to `CANCELLED`. States before vendor
coordination — `INQUIRY_SUBMITTED`, `PROPOSAL_SENT`, `PROPOSAL_ACCEPTED`, `PROPOSAL_REJECTED`, and
`EVENT_CREATED` — transition to `CLOSED` instead. The distinction reflects the operational
difference: a pre-coordination close is administrative (no vendors were ever contacted), while a
post-coordination cancellation is consequential (vendors must be released, venue bookings
withdrawn). The three terminal states — `COMPLETED`, `CANCELLED`, and `CLOSED` — have no outgoing
transitions, and the workflow engine asserts this invariant at startup.

### Cancel-ability as a queryable property

`WorkflowEngine.canBeCancelled(EventStatus state)` exposes the rule so callers (dashboards, UIs)
do not hardcode it:

| State | `canBeCancelled` | Reason |
|---|---|---|
| `INQUIRY_SUBMITTED` | false | Closes rather than cancels (goes to `CLOSED`) |
| `PROPOSAL_SENT` | false | Resolves via accept/reject |
| `PROPOSAL_ACCEPTED` | false | Converts to event |
| `PROPOSAL_REJECTED` | false | Closes |
| `EVENT_CREATED` | false | Closes rather than cancels (goes to `CLOSED`) |
| `AWAITING_VENDORS` | true | Post-creation, vendors being coordinated |
| `NEEDS_COORDINATOR` | true | Post-creation, requires coordinator attention |
| `CONFIRMED` | true | Post-creation, confirmed but not yet completed |
| `COMPLETED` | false | Terminal |
| `CANCELLED` | false | Terminal |
| `CLOSED` | false | Terminal |

## Transition role map

| Transition | Allowed roles |
|---|---|
| `INQUIRY_SUBMITTED → PROPOSAL_SENT` | COORDINATOR |
| `INQUIRY_SUBMITTED → CLOSED` | CLIENT, COORDINATOR |
| `PROPOSAL_SENT → PROPOSAL_ACCEPTED` | CLIENT |
| `PROPOSAL_SENT → PROPOSAL_REJECTED` | CLIENT |
| `PROPOSAL_ACCEPTED → EVENT_CREATED` | COORDINATOR |
| `PROPOSAL_REJECTED → CLOSED` | ADMIN |
| `EVENT_CREATED → AWAITING_VENDORS` | COORDINATOR |
| `EVENT_CREATED → NEEDS_COORDINATOR` | COORDINATOR |
| `EVENT_CREATED → CLOSED` | ADMIN |
| `AWAITING_VENDORS → CONFIRMED` | VENDOR |
| `AWAITING_VENDORS → NEEDS_COORDINATOR` | VENDOR, COORDINATOR |
| `AWAITING_VENDORS → CANCELLED` | CLIENT, COORDINATOR |
| `CONFIRMED → COMPLETED` | ADMIN, COORDINATOR |
| `CONFIRMED → CANCELLED` | CLIENT, COORDINATOR |
| `NEEDS_COORDINATOR → AWAITING_VENDORS` | VENDOR, COORDINATOR |
| `NEEDS_COORDINATOR → CONFIRMED` | VENDOR, COORDINATOR |
| `NEEDS_COORDINATOR → CANCELLED` | CLIENT, COORDINATOR |

## Vendor assignment status transitions

A separate table governs `VendorAssignmentStatus` (`isValidAssignmentTransition` /
`validateAssignmentTransition`):

| From | To | Allowed roles | Produced by |
|---|---|---|---|
| `PENDING` | `ACCEPTED` | VENDOR | `respondToAssignment` (accept) |
| `PENDING` | `DECLINED` | VENDOR | `respondToAssignment` (decline) |
| `DECLINED` | `OPEN` | VENDOR | `autoReassign` (ranked list exhausted) |
| `OPEN` | `PENDING` | VENDOR, COORDINATOR | `claimOpenAssignment` / `forceAssignToOpenAssignment` |
| `OPEN` | `CANCELLED` | COORDINATOR | — |

`ACCEPTED`, `COMPLETED`, and `CANCELLED` are terminal for assignments. `DECLINED` is
**not** terminal: a decline that exhausts the ranked vendor list opens the assignment to the
pool so any vendor can claim it, which is why `DECLINED → OPEN` exists. There is deliberately
**no `PENDING → OPEN`**: the only route into `OPEN` is `PENDING → DECLINED → OPEN`, and a
`PENDING` assignment is still in flight with its assigned vendor.

These rules are enforced at every call site that changes an assignment status, so a status can
never change without an authorization check:

| Call site | Transition | Role |
|---|---|---|
| `respondToAssignment` (accept) | `PENDING → ACCEPTED` | VENDOR |
| `respondToAssignment` (decline) | `PENDING → DECLINED` | VENDOR |
| `autoReassign` (exhaustion) | `DECLINED → OPEN` | VENDOR |
| `claimOpenAssignment` | `OPEN → PENDING` | VENDOR |
| `forceAssignToOpenAssignment` | `OPEN → PENDING` | COORDINATOR |

## How to extend the workflow safely

1. Add the transition to the transition table.
2. Add the role map entry — **step 1 without step 2 fails at startup**, not at first use.
3. Run `WorkflowEngineTest`. The terminal-state invariant tests and the cancel-ability tests
   document the intended semantics; a change that breaks the pre/post-coordination distinction
   (e.g. adding `EVENT_CREATED → CANCELLED`) will fail `preCoordinationStatesAreNotCancellable`
   and `preCoordinationStatesUseClosed`.
4. If the change affects how a category's state maps to the event state, update
   `evaluateEventRollup` and run `EventRollupTest` — the rollup, not the individual service
   action, owns the event status.
