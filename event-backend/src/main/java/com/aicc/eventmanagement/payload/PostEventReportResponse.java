package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.PostEventReport;
import com.aicc.eventmanagement.enums.IncidentReportStatus;
import com.aicc.eventmanagement.enums.IncidentType;

import java.time.LocalDateTime;

public record PostEventReportResponse(
        Long id,
        Long eventId,
        String eventName,
        Long vendorId,
        String vendorName,
        IncidentType incidentType,
        String notes,
        Integer scorePenalty,
        IncidentReportStatus status,
        String source,
        Long reviewedBy,
        LocalDateTime reviewedAt,
        String reviewNotes,
        LocalDateTime createdAt
) {
    public static PostEventReportResponse from(PostEventReport r) {
        return new PostEventReportResponse(
                r.getId(),
                r.getEvent() != null ? r.getEvent().getId() : null,
                r.getEvent() != null ? r.getEvent().getName() : null,
                r.getVendor() != null ? r.getVendor().getId() : null,
                r.getVendor() != null ? r.getVendor().getCompanyName() : null,
                r.getIncidentType(),
                r.getNotes(),
                r.getScorePenalty(),
                r.getStatus(),
                r.getSource(),
                r.getReviewedBy(),
                r.getReviewedAt(),
                r.getReviewNotes(),
                r.getCreatedAt()
        );
    }
}