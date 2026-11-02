package com.aicc.eventmanagement.payload;

import java.time.LocalDate;
import java.util.List;

/** Current, read-only vendor eligibility and ranking preview for one event category. */
public record VendorDecisionPreviewResponse(
        Long eventId,
        String category,
        LocalDate eventDate,
        List<EligibleVendor> eligible,
        List<ExcludedVendor> excluded
) {
    public record EligibleVendor(
            Long vendorId,
            String companyName,
            int rank,
            double score,
            double rating,
            double qualityScore,
            double workloadScore,
            double rotationScore,
            String eligibilityExplanation
    ) { }

    public record ExcludedVendor(Long vendorId, String companyName, String reason) { }
}
