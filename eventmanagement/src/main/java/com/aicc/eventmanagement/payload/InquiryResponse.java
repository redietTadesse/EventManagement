package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class InquiryResponse {
    private Long id;
    private Long clientId;
    private String clientName;
    private String eventType;
    private LocalDate eventDate;
    private Integer expectedAttendees;
    private String requirements;
    private EventStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private EventSummary event;

    public static InquiryResponse from(Inquiry inquiry) {
        InquiryResponse response = new InquiryResponse();
        response.setId(inquiry.getId());
        response.setClientId(inquiry.getClientId());
        response.setClientName(inquiry.getClientName());
        response.setEventType(inquiry.getEventType());
        response.setEventDate(inquiry.getEventDate());
        response.setExpectedAttendees(inquiry.getExpectedAttendees());
        response.setRequirements(inquiry.getRequirements());
        response.setStatus(inquiry.getStatus());
        response.setCreatedAt(inquiry.getCreatedAt());
        response.setUpdatedAt(inquiry.getUpdatedAt());

        if (inquiry.getEvent() != null) {
            EventSummary summary = new EventSummary();
            summary.setId(inquiry.getEvent().getId());
            summary.setName(inquiry.getEvent().getName());
            summary.setStatus(inquiry.getEvent().getStatus());
            response.setEvent(summary);
        }
        return response;
    }
}