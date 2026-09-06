package com.aicc.eventmanagement.enums;

public enum EventStatus {
    INQUIRY_SUBMITTED,
    PROPOSAL_SENT,
    PROPOSAL_ACCEPTED,
    PROPOSAL_REJECTED,
    CLOSED,
    EVENT_CREATED,
    AWAITING_VENDORS,
    NEEDS_COORDINATOR,
    CONFIRMED,
    COMPLETED,
    CANCELLED;

    public boolean isTerminal() {
        return this == CLOSED || this == COMPLETED || this == CANCELLED;
    }

    public boolean isEditableByClient() {
        return this == INQUIRY_SUBMITTED || this == PROPOSAL_SENT || this == PROPOSAL_ACCEPTED;
    }

    public boolean requiresCoordinatorAction() {
        return this == NEEDS_COORDINATOR || this == PROPOSAL_SENT;
    }
}