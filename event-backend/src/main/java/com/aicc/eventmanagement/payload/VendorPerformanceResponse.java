package com.aicc.eventmanagement.payload;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class VendorPerformanceResponse {

    private Long vendorId;
    private String companyName;
    private Double averageRating;
    private long totalReviews;
    private long completedAssignments;
    private long declinedAssignments;
    private long acceptedAssignments;
    private List<VendorReviewResponse> recentReviews;
}
