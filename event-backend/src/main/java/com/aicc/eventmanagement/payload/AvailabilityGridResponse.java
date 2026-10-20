package com.aicc.eventmanagement.payload;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class AvailabilityGridResponse {
    private LocalDate startDate;
    private LocalDate endDate;
    private List<VendorRow> vendors;

    @Data
    @Builder
    public static class VendorRow {
        private Long vendorId;
        private String companyName;
        private String serviceCategory;
        private List<DayCell> days;
    }

    @Data
    @Builder
    public static class DayCell {
        private LocalDate date;
        private String status; // "FREE", "PENDING", "BOOKED"
        private String eventName; // Null if FREE
        private Long eventId;     // Null if FREE
        private Long assignmentId; // Null if FREE
    }
}