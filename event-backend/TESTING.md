# Running the regression checks

From `event-backend`, run the full backend suite:

```powershell
mvn.cmd test
```

To run only the authenticated lifecycle scenarios:

```powershell
mvn.cmd -Dtest=EventLifecycleApiIntegrationTest test
```

Use `mvn` in place of `mvn.cmd` on other operating systems. An initial run needs the Maven dependencies available; `-o` can be added when they are already cached.

Every Spring integration test selects the `test` profile. That profile uses in-memory H2, creates and drops its test schema, disables Flyway, and disables email delivery. The lifecycle API class also supplies its own database name and verifies the connection URL before preparing fixtures. It does not use the local `aicc_events` database.

## What the lifecycle API scenarios establish

`EventLifecycleApiIntegrationTest` uses real controllers, signed JWTs, authorization, services, ranking and persistence. Users, vendors and venues are reference fixtures. Business actions are authenticated MockMvc requests. There is deliberately no transaction wrapping an entire test: each request must commit and serialize its own response.

The seven scenarios cover:

- Proposal preparation and preview create no vendor commitments; conversion reserves the full venue window, excludes expired insurance, and omits external catering for a conference.
- A decline creates a separate replacement offer; accepting every required service confirms the event. Earlier attempts remain in history.
- Checklist prerequisites block completion, regeneration preserves edits and manual tasks, and rescheduling moves only deadlines that still follow template offsets. Vendors must reconfirm, and readiness retains the existing weights before event completion.
- An exhausted pool can recover through either manual assignment or force assignment. Cancellation releases active assignments and venue bookings while preserving historical declines.
- A service with no initial vendor keeps the event in `NEEDS_COORDINATOR` and below full readiness until a coordinator resolves it.
- A venue conflict discovered at conversion rolls back the new event, tasks and assignments. Two unsynchronized conversion requests for the same venue produce one successful booking and one conflict response.
- A request for proposal changes preserves editability; final rejection blocks edits, acceptance and conversion with validation responses.

Assertions read state in subsequent requests and check persisted records, response DTO fields, assignment attempts and lifecycle actors.

## Frontend checks

From the frontend root:

```powershell
node --test src/components/calendarModel.test.js src/coordinator/dashboardModel.test.js src/coordinator/eventDetailModel.test.js
npm.cmd run build
```

## Limits of these checks

H2 does not establish MySQL migration compatibility or MySQL-specific locking behavior. MockMvc does not exercise browser rendering or navigation. Fixture JWTs exercise protected business endpoints but do not test registration or the login screen. Email delivery is disabled, so these runs do not establish SMTP delivery. Those checks require separate environments and should be reported separately.
