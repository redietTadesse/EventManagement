package com.aicc.eventmanagement.enums;

public enum VendorAssignmentStatus {
    PENDING,
    ACCEPTED,
    DECLINED,
    EXPIRED,
    COMPLETED,
    OPEN,
    CANCELLED;

    /**
     * A terminal assignment state has no outgoing transitions.
     *
     * DECLINED and EXPIRED are terminal: a failed attempt is a permanent historical
     * fact. When the system reacts to one, it inserts a NEW row (the next offer, or
     * an unclaimed OPEN row) rather than rewriting the failed one. That is what makes
     * the vendor trail an append-only record.
     *
     * ACCEPTED is NOT terminal: when its event completes it transitions to COMPLETED.
     * OPEN is NOT terminal: it transitions to PENDING when claimed or force-assigned.
     */
    public boolean isTerminal() {
        return this == COMPLETED
                || this == CANCELLED
                || this == DECLINED
                || this == EXPIRED;
    }
}