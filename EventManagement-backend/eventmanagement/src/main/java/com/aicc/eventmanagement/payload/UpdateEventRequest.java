package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEventRequest {
    
    @Size(max = 255, message = "Event name must not exceed 255 characters")
    private String name;
    
    private String venue;
    
    private Long venueId;
    
    private String venueDetails;
    
    private String unfilledCategories;
}