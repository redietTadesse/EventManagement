package com.aicc.eventmanagement.payload;

import java.util.List;

public record NotificationPage(
        List<NotificationResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext) {
}