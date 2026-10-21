package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

@DisplayName("WorkflowEngine Unit Tests")
class WorkflowEngineTest {

    private WorkflowEngine workflowEngine;

    @BeforeEach
    void setUp() {
        workflowEngine = new WorkflowEngine();
        workflowEngine.init();
    }

    // ============ VALID TRANSITIONS ============

    @Test
    @DisplayName("Should allow INQUIRY_SUBMITTED → PROPOSAL_SENT")
    void testInquiryToProposalValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.INQUIRY_SUBMITTED,
                EventStatus.PROPOSAL_SENT
        )).isTrue();
    }

    @Test
    @DisplayName("Should allow PROPOSAL_SENT → PROPOSAL_ACCEPTED")
    void testProposalToAcceptedValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.PROPOSAL_SENT,
                EventStatus.PROPOSAL_ACCEPTED
        )).isTrue();
    }

    @Test
    @DisplayName("Should allow PROPOSAL_SENT → PROPOSAL_REJECTED")
    void testProposalToRejectedValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.PROPOSAL_SENT,
                EventStatus.PROPOSAL_REJECTED
        )).isTrue();
    }

    @Test
    @DisplayName("Should allow PROPOSAL_ACCEPTED → EVENT_CREATED")
    void testAcceptedToEventValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.PROPOSAL_ACCEPTED,
                EventStatus.EVENT_CREATED
        )).isTrue();
    }

    @Test
    @DisplayName("Should allow AWAITING_VENDORS → CONFIRMED")
    void testAwaitingToConfirmedValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.AWAITING_VENDORS,
                EventStatus.CONFIRMED
        )).isTrue();
    }

    @Test
    @DisplayName("Should allow EVENT_CREATED to enter vendor assignment states")
    void testEventCreatedToVendorAssignmentStatesValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.EVENT_CREATED,
                EventStatus.AWAITING_VENDORS
        )).isTrue();
        assertThat(workflowEngine.isValidTransition(
                EventStatus.EVENT_CREATED,
                EventStatus.NEEDS_COORDINATOR
        )).isTrue();
    }

    @Test
    @DisplayName("Should allow CONFIRMED → COMPLETED")
    void testConfirmedToCompletedValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.CONFIRMED,
                EventStatus.COMPLETED
        )).isTrue();
    }

    @Test
    @DisplayName("Should allow NEEDS_COORDINATOR → CONFIRMED")
    void testNeedsCoordinatorToConfirmedValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.NEEDS_COORDINATOR,
                EventStatus.CONFIRMED
        )).isTrue();

        workflowEngine.validateTransition(
                EventStatus.NEEDS_COORDINATOR,
                EventStatus.CONFIRMED,
                Role.VENDOR
        );
    }

    @Test
    @DisplayName("Should allow NEEDS_COORDINATOR → AWAITING_VENDORS")
    void testNeedsCoordinatorToAwaitingVendorsValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.NEEDS_COORDINATOR,
                EventStatus.AWAITING_VENDORS
        )).isTrue();

        workflowEngine.validateTransition(
                EventStatus.NEEDS_COORDINATOR,
                EventStatus.AWAITING_VENDORS,
                Role.COORDINATOR
        );
    }

    @Test
    @DisplayName("Should allow a vendor to reopen a category from NEEDS_COORDINATOR after resolution")
    void testNeedsCoordinatorToConfirmedAllowedForVendor() {
        workflowEngine.validateTransition(
                EventStatus.NEEDS_COORDINATOR,
                EventStatus.CONFIRMED,
                Role.VENDOR
        );
    }

    @Test
    @DisplayName("DECLINED is terminal: a failed attempt is never rewritten")
    void declinedIsTerminal() {
        // The pool offer is now a separate vendor-less row inserted by the service,
        // not a rewrite of the declining vendor's row. Recycling that row meant the
        // eventual claim overwrote vendor_id and erased the attempt from the trail
        // and from findTriedVendorIds, letting the ranker re-offer the same event to
        // a vendor who had already declined it.
        assertThat(VendorAssignmentStatus.DECLINED.isTerminal()).isTrue();

        for (VendorAssignmentStatus target : VendorAssignmentStatus.values()) {
            assertThat(workflowEngine.isValidAssignmentTransition(
                    VendorAssignmentStatus.DECLINED, target))
                    .as("DECLINED → %s should be invalid", target)
                    .isFalse();
        }
    }

    @Test
    @DisplayName("PENDING → EXPIRED is valid and EXPIRED is terminal")
    void pendingToExpiredValidAndTerminal() {
        assertThat(workflowEngine.isValidAssignmentTransition(
                VendorAssignmentStatus.PENDING,
                VendorAssignmentStatus.EXPIRED
        )).isTrue();

        // Attributed to the vendor: the cause is the vendor failing to act, the
        // same actor as a decline, which also keeps the resulting event rollup
        // inside the roles already permitted for AWAITING_VENDORS → NEEDS_COORDINATOR.
        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.PENDING,
                VendorAssignmentStatus.EXPIRED,
                Role.VENDOR
        );

        assertThat(VendorAssignmentStatus.EXPIRED.isTerminal()).isTrue();

        for (VendorAssignmentStatus target : VendorAssignmentStatus.values()) {
            assertThat(workflowEngine.isValidAssignmentTransition(
                    VendorAssignmentStatus.EXPIRED, target))
                    .as("EXPIRED → %s should be invalid", target)
                    .isFalse();
        }
    }

    @Test
    @DisplayName("PENDING → OPEN is not a valid assignment transition")
    void pendingToOpenAssignmentInvalid() {
        // Nothing produces this: a category reaches OPEN only when the service
        // inserts a new vendor-less row after the ranked list is exhausted.
        assertThat(workflowEngine.isValidAssignmentTransition(
                VendorAssignmentStatus.PENDING,
                VendorAssignmentStatus.OPEN
        )).isFalse();

        assertThatThrownBy(() -> workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.PENDING,
                VendorAssignmentStatus.OPEN,
                Role.VENDOR
        )).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("OPEN → PENDING is valid for both claiming vendor and force-assigning coordinator")
    void openToPendingAssignmentValid() {
        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.OPEN,
                VendorAssignmentStatus.PENDING,
                Role.VENDOR
        );
        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.OPEN,
                VendorAssignmentStatus.PENDING,
                Role.COORDINATOR
        );

        assertThatThrownBy(() -> workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.OPEN,
                VendorAssignmentStatus.PENDING,
                Role.CLIENT
        )).isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("ACCEPTED can complete while COMPLETED is terminal")
    void acceptedCanCompleteAndCompletedIsTerminal() {
        assertThat(workflowEngine.isValidAssignmentTransition(
                VendorAssignmentStatus.ACCEPTED,
                VendorAssignmentStatus.COMPLETED)).isTrue();
        assertThat(workflowEngine.isValidAssignmentTransition(
                VendorAssignmentStatus.ACCEPTED,
                VendorAssignmentStatus.CANCELLED)).isTrue();
        for (VendorAssignmentStatus target : VendorAssignmentStatus.values()) {
            assertThat(workflowEngine.isValidAssignmentTransition(
                    VendorAssignmentStatus.COMPLETED, target))
                    .as("COMPLETED → %s should be invalid", target)
                    .isFalse();
        }
    }

    @Test
    @DisplayName("Assignment table satisfies its startup invariants")
    void assignmentTableInvariantsHold() {
        // Re-run init: throws if a terminal assignment state has outgoing transitions,
        // a non-terminal one has none, or a transition lacks a role map entry.
        // PENDING, ACCEPTED and OPEN are the non-terminal states; DECLINED, EXPIRED,
        // COMPLETED and CANCELLED are terminal and must declare no outgoing edges.
        WorkflowEngine fresh = new WorkflowEngine();
        assertThatCode(fresh::init).doesNotThrowAnyException();
    }

    // ============ INVALID TRANSITIONS ============

    @Test
    @DisplayName("Should NOT allow INQUIRY_SUBMITTED → EVENT_CREATED (must go through proposal)")
    void testInquiryToEventInvalid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.INQUIRY_SUBMITTED,
                EventStatus.EVENT_CREATED
        )).isFalse();
    }

    @Test
    @DisplayName("Should NOT allow PROPOSAL_SENT → COMPLETED (must be accepted first)")
    void testProposalToCompletedInvalid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.PROPOSAL_SENT,
                EventStatus.COMPLETED
        )).isFalse();
    }

    @Test
    @DisplayName("Should NOT allow COMPLETED → any state (terminal)")
    void testCompletedToAnyInvalid() {
        for (EventStatus status : EventStatus.values()) {
            assertThat(workflowEngine.isValidTransition(EventStatus.COMPLETED, status))
                    .as("COMPLETED → %s should be invalid", status)
                    .isFalse();
        }
    }

    @Test
    @DisplayName("Should NOT allow CANCELLED → any state (terminal)")
    void testCancelledToAnyInvalid() {
        for (EventStatus status : EventStatus.values()) {
            assertThat(workflowEngine.isValidTransition(EventStatus.CANCELLED, status))
                    .as("CANCELLED → %s should be invalid", status)
                    .isFalse();
        }
    }

    // ============ ROLE VALIDATION ============

    @Test
    @DisplayName("Should allow COORDINATOR to send proposal")
    void testCoordinatorCanSendProposal() {
        workflowEngine.validateTransition(
                EventStatus.INQUIRY_SUBMITTED,
                EventStatus.PROPOSAL_SENT,
                Role.COORDINATOR
        );
    }

    @Test
    @DisplayName("Should NOT allow CLIENT to send proposal")
    void testClientCannotSendProposal() {
        assertThatThrownBy(() ->
                workflowEngine.validateTransition(
                        EventStatus.INQUIRY_SUBMITTED,
                        EventStatus.PROPOSAL_SENT,
                        Role.CLIENT
                )
        ).isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Should allow CLIENT to accept proposal")
    void testClientCanAcceptProposal() {
        workflowEngine.validateTransition(
                EventStatus.PROPOSAL_SENT,
                EventStatus.PROPOSAL_ACCEPTED,
                Role.CLIENT
        );
    }

    @Test
    @DisplayName("Should NOT allow VENDOR to accept proposal")
    void testVendorCannotAcceptProposal() {
        assertThatThrownBy(() ->
                workflowEngine.validateTransition(
                        EventStatus.PROPOSAL_SENT,
                        EventStatus.PROPOSAL_ACCEPTED,
                        Role.VENDOR
                )
        ).isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Should allow VENDOR to confirm assignment (AWAITING_VENDORS → CONFIRMED)")
    void testVendorCanConfirmAssignment() {
        workflowEngine.validateTransition(
                EventStatus.AWAITING_VENDORS,
                EventStatus.CONFIRMED,
                Role.VENDOR
        );
    }

    @Test
    @DisplayName("Should allow COORDINATOR to move created event into vendor assignment states")
    void testCoordinatorCanMoveCreatedEventIntoAssignmentStates() {
        workflowEngine.validateTransition(
                EventStatus.EVENT_CREATED,
                EventStatus.AWAITING_VENDORS,
                Role.COORDINATOR
        );
        workflowEngine.validateTransition(
                EventStatus.EVENT_CREATED,
                EventStatus.NEEDS_COORDINATOR,
                Role.COORDINATOR
        );
    }

    @Test
    @DisplayName("Should allow VENDOR to request coordinator from awaiting vendors")
    void testVendorCanMoveAwaitingVendorsToNeedsCoordinator() {
        workflowEngine.validateTransition(
                EventStatus.AWAITING_VENDORS,
                EventStatus.NEEDS_COORDINATOR,
                Role.VENDOR
        );
    }

    @Test
    @DisplayName("Should NOT allow CLIENT to confirm assignment")
    void testClientCannotConfirmAssignment() {
        assertThatThrownBy(() ->
                workflowEngine.validateTransition(
                        EventStatus.AWAITING_VENDORS,
                        EventStatus.CONFIRMED,
                        Role.CLIENT
                )
        ).isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Should throw IllegalStateException for invalid transition")
    void testInvalidTransitionThrowsException() {
        assertThatThrownBy(() ->
                workflowEngine.validateTransition(
                        EventStatus.INQUIRY_SUBMITTED,
                        EventStatus.COMPLETED,
                        Role.COORDINATOR
                )
        ).isInstanceOf(IllegalStateException.class);
    }

    // ============ TERMINAL STATE INVARIANTS ============

    @Test
    @DisplayName("Terminal states have no outgoing transitions")
    void terminalStatesHaveNoOutgoingTransitions() {
        for (EventStatus terminal : List.of(
                EventStatus.COMPLETED,
                EventStatus.CANCELLED,
                EventStatus.CLOSED)) {

            for (EventStatus target : EventStatus.values()) {
                assertThat(workflowEngine.isValidTransition(terminal, target))
                        .as("%s → %s should be invalid", terminal, target)
                        .isFalse();
            }
        }
    }

    @Test
    @DisplayName("COMPLETED cannot be cancelled")
    void completedCannotBeCancelled() {
        assertThat(workflowEngine.canBeCancelled(EventStatus.COMPLETED)).isFalse();
        assertThat(workflowEngine.isValidTransition(
                EventStatus.COMPLETED, EventStatus.CANCELLED)).isFalse();
    }

    @Test
    @DisplayName("CANCELLED cannot be cancelled again")
    void cancelledCannotBeCancelled() {
        assertThat(workflowEngine.canBeCancelled(EventStatus.CANCELLED)).isFalse();
        assertThat(workflowEngine.isValidTransition(
                EventStatus.CANCELLED, EventStatus.CANCELLED)).isFalse();
    }

    @Test
    @DisplayName("CLOSED cannot be cancelled")
    void closedCannotBeCancelled() {
        assertThat(workflowEngine.canBeCancelled(EventStatus.CLOSED)).isFalse();
    }

    @Test
    @DisplayName("Every transition has a role map entry")
    void everyTransitionHasRoleMap() {
        // Re-run init to ensure the invariant check itself doesn't throw.
        // If a role map entry is missing, init() would have thrown already.
        WorkflowEngine fresh = new WorkflowEngine();
        assertThatCode(fresh::init).doesNotThrowAnyException();
    }

    // ============ CANCEL-ABILITY BY STATE ============

    @Test
    @DisplayName("Post-coordination states are cancellable")
    void postCoordinationStatesAreCancellable() {
        assertThat(workflowEngine.canBeCancelled(EventStatus.AWAITING_VENDORS)).isTrue();
        assertThat(workflowEngine.canBeCancelled(EventStatus.NEEDS_COORDINATOR)).isTrue();
        assertThat(workflowEngine.canBeCancelled(EventStatus.CONFIRMED)).isTrue();
    }

    @Test
    @DisplayName("Pre-coordination states are not cancellable")
    void preCoordinationStatesAreNotCancellable() {
        assertThat(workflowEngine.canBeCancelled(EventStatus.INQUIRY_SUBMITTED)).isFalse();
        assertThat(workflowEngine.canBeCancelled(EventStatus.PROPOSAL_SENT)).isFalse();
        assertThat(workflowEngine.canBeCancelled(EventStatus.PROPOSAL_ACCEPTED)).isFalse();
        assertThat(workflowEngine.canBeCancelled(EventStatus.PROPOSAL_REJECTED)).isFalse();
        assertThat(workflowEngine.canBeCancelled(EventStatus.EVENT_CREATED)).isFalse();
    }

    @Test
    @DisplayName("Pre-coordination states use CLOSED, not CANCELLED")
    void preCoordinationStatesUseClosed() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.INQUIRY_SUBMITTED, EventStatus.CLOSED)).isTrue();
        assertThat(workflowEngine.isValidTransition(
                EventStatus.INQUIRY_SUBMITTED, EventStatus.CANCELLED)).isFalse();
        assertThat(workflowEngine.isValidTransition(
                EventStatus.PROPOSAL_REJECTED, EventStatus.CLOSED)).isTrue();
        assertThat(workflowEngine.isValidTransition(
                EventStatus.PROPOSAL_REJECTED, EventStatus.CANCELLED)).isFalse();
        assertThat(workflowEngine.isValidTransition(
                EventStatus.EVENT_CREATED, EventStatus.CLOSED)).isTrue();
        assertThat(workflowEngine.isValidTransition(
                EventStatus.EVENT_CREATED, EventStatus.CANCELLED)).isFalse();
    }

    // ============ ROLLUP-PRODUCED TRANSITIONS (Gap 1) ============

    @Test
    @DisplayName("NEEDS_COORDINATOR → CONFIRMED is valid for VENDOR and COORDINATOR")
    void needsCoordinatorToConfirmedIsAuthorized() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.NEEDS_COORDINATOR, EventStatus.CONFIRMED)).isTrue();
        assertThatCode(() -> workflowEngine.validateTransition(
                EventStatus.NEEDS_COORDINATOR, EventStatus.CONFIRMED, Role.VENDOR))
                .doesNotThrowAnyException();
        assertThatCode(() -> workflowEngine.validateTransition(
                EventStatus.NEEDS_COORDINATOR, EventStatus.CONFIRMED, Role.COORDINATOR))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> workflowEngine.validateTransition(
                EventStatus.NEEDS_COORDINATOR, EventStatus.CONFIRMED, Role.CLIENT))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("NEEDS_COORDINATOR → AWAITING_VENDORS is valid for VENDOR and COORDINATOR")
    void needsCoordinatorToAwaitingVendorsIsAuthorized() {
        // The rollup produces this when a stuck category is resolved:
        // COORDINATOR via manualAssign/autoAssign/forceAssign, VENDOR via claimOpenAssignment.
        assertThat(workflowEngine.isValidTransition(
                EventStatus.NEEDS_COORDINATOR, EventStatus.AWAITING_VENDORS)).isTrue();
        assertThatCode(() -> workflowEngine.validateTransition(
                EventStatus.NEEDS_COORDINATOR, EventStatus.AWAITING_VENDORS, Role.VENDOR))
                .doesNotThrowAnyException();
        assertThatCode(() -> workflowEngine.validateTransition(
                EventStatus.NEEDS_COORDINATOR, EventStatus.AWAITING_VENDORS, Role.COORDINATOR))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> workflowEngine.validateTransition(
                EventStatus.NEEDS_COORDINATOR, EventStatus.AWAITING_VENDORS, Role.CLIENT))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Rollup decline path: AWAITING_VENDORS → NEEDS_COORDINATOR is vendor-authorized")
    void awaitingVendorsToNeedsCoordinatorIsVendorAuthorized() {
        assertThatCode(() -> workflowEngine.validateTransition(
                EventStatus.AWAITING_VENDORS, EventStatus.NEEDS_COORDINATOR, Role.VENDOR))
                .doesNotThrowAnyException();
    }
}