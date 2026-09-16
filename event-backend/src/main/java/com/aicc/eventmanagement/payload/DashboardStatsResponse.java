package com.aicc.eventmanagement.payload;

import java.util.Map;

public record DashboardStatsResponse(
        long totalUsers,
        long activeUsers,
        long activeVendors,
        long totalEvents,
        Map<String, Long> eventsByStatus
) {
}