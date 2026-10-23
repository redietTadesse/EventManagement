package com.aicc.eventmanagement.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorRecommendationResponse {

    private List<CategoryRecommendation> categories;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryRecommendation {
        private String category;
        private List<VendorOption> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VendorOption {
        private Long vendorId;
        private String companyName;
        private String serviceCategory;
        private String description;
        private Integer rating;
        private boolean availableOnEventDate;
        private double score;
        private String reason;
    }
}