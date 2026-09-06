package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

class WorkflowEngineTest {

    private WorkflowEngine workflowEngine;

    @BeforeEach
    void setUp() {
        workflowEngine = new WorkflowEngine();
        workflowEngine.init();
    }

    @Test
    void testValidTransitions() {
        assertTrue(workflowEngine.isValidTransition(EventStatus.INQUIRY_SUBMITTED, EventStatus.PROPOSAL_SENT));
        assertTrue(workflowEngine.isValidTransition(EventStatus.INQUIRY_SUBMITTED, EventStatus.CLOSED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.PROPOSAL_SENT, EventStatus.PROPOSAL_ACCEPTED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.PROPOSAL_SENT, EventStatus.PROPOSAL_REJECTED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.PROPOSAL_ACCEPTED, EventStatus.EVENT_CREATED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.PROPOSAL_REJECTED, EventStatus.CLOSED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.EVENT_CREATED, EventStatus.CLOSED));

        assertTrue(workflowEngine.isValidTransition(EventStatus.AWAITING_VENDORS, EventStatus.CONFIRMED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.AWAITING_VENDORS, EventStatus.NEEDS_COORDINATOR));
        assertTrue(workflowEngine.isValidTransition(EventStatus.AWAITING_VENDORS, EventStatus.CANCELLED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.CONFIRMED, EventStatus.COMPLETED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.CONFIRMED, EventStatus.CANCELLED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.NEEDS_COORDINATOR, EventStatus.AWAITING_VENDORS));
        assertTrue(workflowEngine.isValidTransition(EventStatus.NEEDS_COORDINATOR, EventStatus.CANCELLED));
    }

    @ParameterizedTest
    @CsvSource({
            "INQUIRY_SUBMITTED, COMPLETED",
            "INQUIRY_SUBMITTED, CONFIRMED",
            "INQUIRY_SUBMITTED, AWAITING_VENDORS",
            "PROPOSAL_SENT, CLOSED",
            "PROPOSAL_SENT, EVENT_CREATED",
            "PROPOSAL_SENT, COMPLETED",
            "PROPOSAL_ACCEPTED, CLOSED",
            "PROPOSAL_ACCEPTED, PROPOSAL_REJECTED",
            "PROPOSAL_REJECTED, PROPOSAL_SENT",
            "EVENT_CREATED, PROPOSAL_SENT",
            "EVENT_CREATED, COMPLETED",
            "AWAITING_VENDORS, COMPLETED",
            "AWAITING_VENDORS, PROPOSAL_SENT",
            "CONFIRMED, AWAITING_VENDORS",
            "CONFIRMED, NEEDS_COORDINATOR",
            "NEEDS_COORDINATOR, CONFIRMED",
            "NEEDS_COORDINATOR, COMPLETED",
            "CLOSED, INQUIRY_SUBMITTED",
            "COMPLETED, CONFIRMED",
            "CANCELLED, AWAITING_VENDORS"
    })
    void testInvalidTransitions(EventStatus from, EventStatus to) {
        assertFalse(workflowEngine.isValidTransition(from, to));
    }

    @Test
    void testValidRoleTransitions() {
        assertDoesNotThrow(() ->
                workflowEngine.validateTransition(EventStatus.INQUIRY_SUBMITTED, EventStatus.PROPOSAL_SENT, Role.COORDINATOR)
        );
        assertDoesNotThrow(() ->
                workflowEngine.validateTransition(EventStatus.PROPOSAL_SENT, EventStatus.PROPOSAL_ACCEPTED, Role.CLIENT)
        );
        assertDoesNotThrow(() ->
                workflowEngine.validateTransition(EventStatus.PROPOSAL_SENT, EventStatus.PROPOSAL_REJECTED, Role.CLIENT)
        );
        assertDoesNotThrow(() ->
                workflowEngine.validateTransition(EventStatus.AWAITING_VENDORS, EventStatus.CONFIRMED, Role.VENDOR)
        );
        assertDoesNotThrow(() ->
                workflowEngine.validateTransition(EventStatus.AWAITING_VENDORS, EventStatus.NEEDS_COORDINATOR, Role.COORDINATOR)
        );
        assertDoesNotThrow(() ->
                workflowEngine.validateTransition(EventStatus.CONFIRMED, EventStatus.COMPLETED, Role.ADMIN)
        );
        assertDoesNotThrow(() ->
                workflowEngine.validateTransition(EventStatus.CONFIRMED, EventStatus.COMPLETED, Role.COORDINATOR)
        );
        assertDoesNotThrow(() ->
                workflowEngine.validateTransition(EventStatus.CONFIRMED, EventStatus.CANCELLED, Role.CLIENT)
        );
    }

    @Test
    void testInvalidRoleTransitions() {
        assertThrows(SecurityException.class, () ->
                workflowEngine.validateTransition(EventStatus.INQUIRY_SUBMITTED, EventStatus.PROPOSAL_SENT, Role.CLIENT)
        );
        assertThrows(SecurityException.class, () ->
                workflowEngine.validateTransition(EventStatus.PROPOSAL_SENT, EventStatus.PROPOSAL_ACCEPTED, Role.VENDOR)
        );
        assertThrows(SecurityException.class, () ->
                workflowEngine.validateTransition(EventStatus.AWAITING_VENDORS, EventStatus.CONFIRMED, Role.CLIENT)
        );
        assertThrows(SecurityException.class, () ->
                workflowEngine.validateTransition(EventStatus.CONFIRMED, EventStatus.COMPLETED, Role.VENDOR)
        );
        assertThrows(SecurityException.class, () ->
                workflowEngine.validateTransition(EventStatus.PROPOSAL_SENT, EventStatus.PROPOSAL_REJECTED, Role.COORDINATOR)
        );
    }

    @Test
    void testStructuralInvalidTransitionThrowsException() {
        assertThrows(IllegalStateException.class, () ->
                workflowEngine.validateTransition(EventStatus.INQUIRY_SUBMITTED, EventStatus.COMPLETED, Role.COORDINATOR)
        );
        assertThrows(IllegalStateException.class, () ->
                workflowEngine.validateTransition(EventStatus.PROPOSAL_ACCEPTED, EventStatus.CLOSED, Role.COORDINATOR)
        );
    }

    @Test
    void testDeadEndStates() {
        assertFalse(workflowEngine.isValidTransition(EventStatus.CLOSED, EventStatus.INQUIRY_SUBMITTED));
        assertFalse(workflowEngine.isValidTransition(EventStatus.CLOSED, EventStatus.PROPOSAL_SENT));
        assertFalse(workflowEngine.isValidTransition(EventStatus.CLOSED, EventStatus.AWAITING_VENDORS));
        assertFalse(workflowEngine.isValidTransition(EventStatus.CLOSED, EventStatus.COMPLETED));

        assertFalse(workflowEngine.isValidTransition(EventStatus.COMPLETED, EventStatus.CONFIRMED));
        assertFalse(workflowEngine.isValidTransition(EventStatus.COMPLETED, EventStatus.CANCELLED));

        assertFalse(workflowEngine.isValidTransition(EventStatus.CANCELLED, EventStatus.AWAITING_VENDORS));
        assertFalse(workflowEngine.isValidTransition(EventStatus.CANCELLED, EventStatus.CONFIRMED));
        assertFalse(workflowEngine.isValidTransition(EventStatus.CANCELLED, EventStatus.COMPLETED));
    }

    @Test
    void testAllStatesHaveSomeTransitions() {
        assertTrue(workflowEngine.isValidTransition(EventStatus.INQUIRY_SUBMITTED, EventStatus.PROPOSAL_SENT));
        assertTrue(workflowEngine.isValidTransition(EventStatus.PROPOSAL_SENT, EventStatus.PROPOSAL_ACCEPTED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.PROPOSAL_ACCEPTED, EventStatus.EVENT_CREATED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.PROPOSAL_REJECTED, EventStatus.CLOSED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.EVENT_CREATED, EventStatus.CLOSED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.AWAITING_VENDORS, EventStatus.CONFIRMED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.CONFIRMED, EventStatus.COMPLETED));
        assertTrue(workflowEngine.isValidTransition(EventStatus.NEEDS_COORDINATOR, EventStatus.AWAITING_VENDORS));

        assertFalse(workflowEngine.isValidTransition(EventStatus.CLOSED, EventStatus.INQUIRY_SUBMITTED));
        assertFalse(workflowEngine.isValidTransition(EventStatus.COMPLETED, EventStatus.CONFIRMED));
        assertFalse(workflowEngine.isValidTransition(EventStatus.CANCELLED, EventStatus.AWAITING_VENDORS));
    }
}