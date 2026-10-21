package com.aicc.eventmanagement.enums;

/**
 * Why a particular vendor was chosen for an attempt, captured at decision time.
 *
 * This is recorded, never recomputed. The ranking that produced it depends on the
 * candidate set and each vendor's workload at that instant, and both change over
 * time, so a later replay would produce a different answer than the one the system
 * actually acted on.
 */
public enum SelectionReason {

    CLIENT_PREFERRED("client preferred"),
    TOP_RATED("top rated"),
    LEAST_LOADED("least loaded"),
    TIE_BREAK("tie broken by vendor id"),
    ONLY_CANDIDATE("only vendor available"),
    ROTATION_REFRESHED("rotation refreshed"),
    COORDINATOR_MANUAL("assigned by coordinator"),
    COORDINATOR_FORCED("forced by coordinator"),
    POOL_OPENED("opened to vendor pool"),
    POOL_CLAIM("claimed from open pool");

    private final String label;

    SelectionReason(String label) {
        this.label = label;
    }

    /** One-line text for the coordinator's trail drawer. */
    public String getLabel() {
        return label;
    }
}