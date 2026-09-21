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
     * DECLINED is deliberately NOT terminal: a decline that exhausts the ranked vendor
     * list opens the assignment to the pool (DECLINED -> OPEN) so any vendor can claim it.
     */
    public boolean isTerminal() {
        return this == ACCEPTED || this == COMPLETED || this == CANCELLED;
    }
}