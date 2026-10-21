package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * The escalation state of one required service category for one event.
 *
 * A view over existing VendorAssignment rows — not a persisted entity.
 * The escalation is the ordered sequence of vendor attempts (one per vendor)
 * for a given (event, category). The current attempt is the most recent row by id.
 *
 * A category is:
 *   RESOLVED   if any attempt is ACCEPTED or COMPLETED
 *   EXHAUSTED  if the current attempt is DECLINED, EXPIRED, OPEN, or CANCELLED,
 *              or if there are no attempts at all
 *   PENDING    if the current attempt is PENDING
 *
 * Event-level rollup is a function of these states across all required categories.
 */
public record CategoryEscalation(
        Long eventId,
        String category,
        List<VendorAssignment> attempts
) {

    public Optional<VendorAssignment> currentAttempt() {
        return attempts.stream()
                .max(Comparator.comparing(VendorAssignment::getId));
    }

    public boolean isResolved() {
        return attempts.stream().anyMatch(a ->
                a.getStatus() == VendorAssignmentStatus.ACCEPTED
                        || a.getStatus() == VendorAssignmentStatus.COMPLETED);
    }

    /**
     * EXPIRED counts as exhausted. Without it a category whose latest offer timed
     * out would be neither exhausted, pending, nor resolved, and the rollup would
     * park the event in AWAITING_VENDORS forever waiting on an offer nobody holds.
     */
    public boolean isExhausted() {
        return currentAttempt()
                .map(a -> a.getStatus() == VendorAssignmentStatus.DECLINED
                        || a.getStatus() == VendorAssignmentStatus.EXPIRED
                        || a.getStatus() == VendorAssignmentStatus.OPEN
                        || a.getStatus() == VendorAssignmentStatus.CANCELLED)
                .orElse(true);
    }

    public boolean isPending() {
        return currentAttempt()
                .map(a -> a.getStatus() == VendorAssignmentStatus.PENDING)
                .orElse(false);
    }

    /** Number of vendor attempts made so far (declined + pending + resolved). */
    public int attemptsCount() {
        return attempts.size();
    }
}