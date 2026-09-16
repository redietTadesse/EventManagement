package com.aicc.eventmanagement.payload;

import java.time.LocalDate;

public record VenueAvailabilityResponse(Long venueId, LocalDate date, boolean available) {
}