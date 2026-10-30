package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.enums.SelectionReason;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;

import java.time.LocalDateTime;
import java.util.List;

/**
 * The full offer history for one event, grouped by service category.
 *
 * Every field here is read from stored rows. Nothing is recomputed: the score and
 * reason were written when the decision was made, and replaying the ranking now
 * would score a different candidate set against different workloads, producing a
 * number the system never actually acted on.
 */
public record VendorTrailResponse(
        Long eventId,
        String eventName,
        List<CategoryTrail> categories
) {

    /** @param state RESOLVED, PENDING or EXHAUSTED. */
    public record CategoryTrail(
            String category,
            String state,
            int attemptCount,
            List<Attempt> attempts
    ) {}

    /**
     * @param rankingScore null when the attempt bypassed ranking (client-preferred,
     *                     coordinator-assigned, or an unclaimed pool row)
     * @param reason       the display label for selectionReason
     * @param outcome      what the system did next, derived from the following attempt
     */
    public record Attempt(
            int attemptNumber,
            Long assignmentId,
            Long vendorId,
            String vendorName,
            VendorAssignmentStatus status,
            Double rankingScore,
            SelectionReason selectionReason,
            String reason,
            LocalDateTime offeredAt,
            LocalDateTime respondedAt,
            LocalDateTime expiresAt,
            String declineReason,
            String outcome,
            String decisionSnapshot
    ) {}
}
