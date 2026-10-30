package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.VenueBooking;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VenueBookingResponse {

    private Long id;
    private Long venueId;
    private String venueName;
    private Long eventId;
    private String eventName;
    private String eventStatus;
    private LocalDate bookingDate;
    private String status;
    private LocalDateTime expiresAt;
    private String heldBy;

    public static VenueBookingResponse from(VenueBooking booking) {
        Event event = booking.getEvent();
        return VenueBookingResponse.builder()
                .id(booking.getId())
                .venueId(booking.getVenue().getId())
                .venueName(booking.getVenue().getName())
                .eventId(event != null ? event.getId() : null)
                .eventName(event != null ? event.getName() : null)
                .eventStatus(event != null && event.getStatus() != null ? event.getStatus().name() : null)
                .bookingDate(booking.getBookingDate())
                .status(booking.getStatus() != null ? booking.getStatus().name() : null)
                .expiresAt(booking.getExpiresAt())
                .heldBy(booking.getHeldBy())
                .build();
    }
}