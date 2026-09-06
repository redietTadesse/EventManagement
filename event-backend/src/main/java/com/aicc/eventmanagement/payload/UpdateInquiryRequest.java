package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateInquiryRequest {
    
    @Size(max = 100, message = "Client name must not exceed 100 characters")
    private String clientName;
    
    @Size(max = 50, message = "Event type must not exceed 50 characters")
    private String eventType;
    
    private LocalDate eventDate;
    
    private Integer expectedAttendees;
    
    @Size(max = 1000, message = "Requirements must not exceed 1000 characters")
    private String requirements;
}