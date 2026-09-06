package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ConvertToEventRequest {

    @Size(max = 255, message = "Event name must not exceed 255 characters")
    private String name;

    private String venue;

    private Long venueId;

    private String venueDetails; // JSON string

    private String unfilledCategories;
}