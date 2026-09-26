package com.aicc.eventmanagement.enums;

public enum VendorAssignmentStatus {
    PENDING,
    ACCEPTED,
    DECLINED,
    COMPLETED,
    OPEN,
    CANCELLED;

    /**
     * A terminal assignment state has no outgoing transitions.
     *
     * ACCEPTED is NOT terminal: when its event completes, it transitions to COMPLETED.
     * DECLINED is NOT terminal: an exhausted decline transitions to OPEN.
     * COMPLETED and CANCELLED are terminal.
     */
    public boolean isTerminal() {
        return this == COMPLETED || this == CANCELLED;
    }
}