package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInquiryRequest {

    @NotNull(message = "Client ID is required")
    private Long clientId;

    @NotBlank(message = "Client name is required")
    @Size(max = 100, message = "Client name must not exceed 100 characters")
    private String clientName;

    @NotBlank(message = "Event type is required")
    @Size(max = 50, message = "Event type must not exceed 50 characters")
    private String eventType;

    @NotNull(message = "Event date is required")
    @Future(message = "Event date must be in the future")
    private LocalDate eventDate;

    @NotNull(message = "Expected attendees is required")
    @Min(value = 1, message = "At least 1 attendee required")
    private Integer expectedAttendees;

    @Size(max = 1000, message = "Requirements must not exceed 1000 characters")
    private String requirements;

    private java.util.List<String> requestedCategories;
}