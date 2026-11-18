package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.enums.IncidentType;

public record CoordinatorReportRequest(
        Long eventId,
        Long vendorId,
        IncidentType incidentType,
        String notes
) {}