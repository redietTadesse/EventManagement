package com.aicc.eventmanagement.enums;

public enum IncidentReportStatus {
    PENDING,    // filed by client, awaiting coordinator review
    CONFIRMED,  // coordinator verified -> counts as strike
    REJECTED    // coordinator dismissed -> no strike
}