package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.enums.EventStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InquirySearchRequest {
    
    private EventStatus status;
    private Long clientId;
    private String eventType;
    private String clientName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer minAttendees;
    private Integer maxAttendees;
}