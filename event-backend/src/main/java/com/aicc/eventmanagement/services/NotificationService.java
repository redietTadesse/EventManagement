package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.AppNotification;
import com.aicc.eventmanagement.entities.AppNotification.Destination;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.repositories.AppNotificationRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final AppNotificationRepository notifications;
    private final UserRepository users;
    private final ApplicationEventPublisher events;

    public record EmailRequested(String recipient, String title, String message, String path) {}
    public record Item(Long id, String title, String message, boolean read, String path, LocalDateTime createdAt) {}
    public record Inbox(List<Item> items, long unreadCount) {}

    @Transactional
    public void notifyUser(Long userId, Destination destination, Long referenceId, String title, String message) {
        if (userId == null) return;
        User user = users.findById(userId).orElse(null);
        if (user == null || !user.isActive()) return;
        AppNotification item = new AppNotification();
        item.setUserId(userId);
        item.setDestination(destination.name());
        item.setReferenceId(referenceId);
        item.setTitle(title);
        item.setMessage(message);
        item.setCreatedAt(LocalDateTime.now());
        notifications.save(item);
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            events.publishEvent(new EmailRequested(user.getEmail(), title, message, destination.path(referenceId)));
        }
    }

    @Transactional(readOnly = true)
    public Inbox inbox(String username) {
        Long userId = userId(username);
        List<Item> items = notifications.findTop30ByUserIdOrderByCreatedAtDescIdDesc(userId).stream()
                .map(row -> new Item(row.getId(), row.getTitle(), row.getMessage(), row.isRead(),
                        destinationPath(row), row.getCreatedAt())).toList();
        return new Inbox(items, notifications.countByUserIdAndReadFalse(userId));
    }

    @Transactional
    public void markRead(String username, Long id) {
        if (notifications.markRead(userId(username), id) == 0) {
            throw new EntityNotFoundException("Notification", id);
        }
    }

    @Transactional
    public void markAllRead(String username) {
        notifications.markAllRead(userId(username));
    }

    private Long userId(String username) {
        return users.findByUsername(username).orElseThrow(() -> new AccessDeniedException("Account unavailable")).getId();
    }

    private static String destinationPath(AppNotification row) {
        if (row.getReferenceId() == null) return null;
        try {
            return Destination.valueOf(row.getDestination()).path(row.getReferenceId());
        } catch (IllegalArgumentException e) {
            return null; // Older notification records may use a different type.
        }
    }
}
