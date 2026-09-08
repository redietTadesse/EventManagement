package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
    @DisplayName("Should allow CONFIRMED → COMPLETED")
    void testConfirmedToCompletedValid() {
        assertThat(workflowEngine.isValidTransition(
                EventStatus.CONFIRMED,
                EventStatus.COMPLETED
        )).isTrue();
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
}
