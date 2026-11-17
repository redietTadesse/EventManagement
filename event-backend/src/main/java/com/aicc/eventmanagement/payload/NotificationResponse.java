package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.AppNotification;
import com.aicc.eventmanagement.entities.AppNotification.Destination;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        Long referenceId,
        boolean read,
        String path,
        LocalDateTime createdAt) {

    public static NotificationResponse from(AppNotification n) {
        return new NotificationResponse(
                n.getId(),
                n.getDestination(),
                n.getTitle(),
                n.getMessage(),
                n.getReferenceId(),
                n.isRead(),
                path(n),
                n.getCreatedAt());
    }

    private static String path(AppNotification notification) {
        if (notification.getReferenceId() == null || notification.getDestination() == null) return null;
        Destination destination = switch (notification.getDestination()) {
            case "CLIENT_INQUIRY", "PROPOSAL_SENT", "EVENT_COMPLETED" -> Destination.CLIENT_INQUIRY;
            case "COORDINATOR_INQUIRY", "INQUIRY_SUBMITTED", "PROPOSAL_ACCEPTED",
                    "PROPOSAL_CHANGE_REQUESTED" -> Destination.COORDINATOR_INQUIRY;
            case "VENDOR_ASSIGNMENT", "VENDOR_ASSIGNMENT_OFFERED" -> Destination.VENDOR_ASSIGNMENT;
            case "COORDINATOR_EVENT", "VENDOR_ACCEPTED", "VENDOR_DECLINED" -> Destination.COORDINATOR_EVENT;
            case "CLIENT_EVENT" -> Destination.CLIENT_EVENT;
            default -> null;
        };
        return destination == null ? null : destination.path(notification.getReferenceId());
    }
}
