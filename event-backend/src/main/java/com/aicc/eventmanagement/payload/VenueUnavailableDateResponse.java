package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.VenueUnavailableDate;

import java.time.LocalDate;

public record VenueUnavailableDateResponse(Long id, Long venueId, LocalDate date, String reason) {

    public static VenueUnavailableDateResponse from(VenueUnavailableDate unavailableDate) {
        return new VenueUnavailableDateResponse(
                unavailableDate.getId(),
                unavailableDate.getVenue().getId(),
                unavailableDate.getUnavailableDate(),
                unavailableDate.getReason());
    }
}
