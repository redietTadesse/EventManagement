package com.aicc.eventmanagement.payload;

import java.time.LocalDate;
import com.aicc.eventmanagement.enums.EventStatus;

public record DashboardUpcomingEvent(
        Long eventId,
        String eventName,
        EventStatus status,
        LocalDate eventDate,
        String clientName,
        String venue,
        Integer expectedAttendees
) {
}
