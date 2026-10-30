package com.aicc.eventmanagement.payload;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Venue rows by date columns. Deliberately mirrors AvailabilityGridResponse so the
 * coordinator frontend can reuse the same rendering shape.
 */
@Data
@Builder
public class VenueAvailabilityGridResponse {

    private LocalDate startDate;
    private LocalDate endDate;
    private List<VenueRow> venues;

    @Data
    @Builder
    public static class VenueRow {
        private Long venueId;
        private String name;
        private String location;
        private Integer capacity;
        private List<DayCell> days;
    }

    @Data
    @Builder
    public static class DayCell {
        private LocalDate date;
        /** "FREE", "HELD" or "BOOKED". */
        private String status;
        private String eventName;
        private Long eventId;
        /** The venue_bookings row id, so the UI can release a hold directly. */
        private Long bookingId;
        private String heldBy;
        private LocalDateTime expiresAt;
    }
}