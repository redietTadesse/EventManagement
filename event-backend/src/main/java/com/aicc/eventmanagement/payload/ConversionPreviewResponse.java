package com.aicc.eventmanagement.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionPreviewResponse {
    private Long inquiryId;
    private String eventType;
    private LocalDate eventDate;
    private Integer expectedAttendees;
    private List<String> requiredCategories;
    private VenuePreview venue;
    private List<CategoryPreview> categories;
    private String timelineEstimate;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VenuePreview {
        private Long venueId;
        private String venueName;
        private Integer capacity;
        private boolean available;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryPreview {
        private String category;
        private List<VendorCandidate> candidates;
        private String warning;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VendorCandidate {
        private Long vendorId;
        private String companyName;
        private Double rating;
        private long currentLoad;
        private double score;
        private int rank;
        private boolean hasRecentDecline;
    }
}
