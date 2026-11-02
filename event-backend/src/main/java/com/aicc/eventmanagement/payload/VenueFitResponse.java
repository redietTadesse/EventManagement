package com.aicc.eventmanagement.payload;

import java.time.LocalDate;
import java.util.List;

/** Read-only explanation of a venue's fit for an event date and attendance. */
public record VenueFitResponse(
        Long venueId,
        String name,
        String location,
        Integer capacity,
        boolean active,
        boolean eligible,
        LocalDate blockedFrom,
        LocalDate blockedThrough,
        List<String> explanation
) { }
