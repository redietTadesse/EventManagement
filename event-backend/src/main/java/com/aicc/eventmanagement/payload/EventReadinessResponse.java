package com.aicc.eventmanagement.payload;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EventReadinessResponse {
    private int readinessPercentage;
    private boolean venueConfirmed;
    private int totalRequiredVendors;
    private int confirmedVendors;
    private int pendingVendors;
    private int completedChecklistItems;
    private int totalChecklistItems;
}
