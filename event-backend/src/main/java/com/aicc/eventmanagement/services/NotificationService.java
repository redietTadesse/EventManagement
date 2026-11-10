
package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.AppNotification;
import com.aicc.eventmanagement.entities.AppNotification.Destination;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.NotificationResponse;
import com.aicc.eventmanagement.repositories.AppNotificationRepository;
import com.aicc.eventmanagement.repositories.UserRepository;

import java.time.LocalDateTime;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final AppNotificationRepository appNotificationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher events;

    public record EmailRequested(
            String recipient,
            String title,
            String message,
            String path
    ) {}

    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(Long recipientId, Pageable pageable) {
        return appNotificationRepository.findByUserIdOrderByCreatedAtDescIdDesc(recipientId, pageable)
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long recipientId) {
        return appNotificationRepository.countByUserIdAndReadFalse(recipientId);
    }

    @Transactional
    public void markRead(Long id, Long recipientId) {
        AppNotification notification = appNotificationRepository.findByIdAndUserId(id, recipientId)
                .orElseThrow(() -> new EntityNotFoundException("Notification", id));
        notification.setRead(true);
    }

    @Transactional
    public void markAllRead(Long recipientId) {
        appNotificationRepository.markAllRead(recipientId);
    }

    @Transactional
    public void notifyUser(
            Long userId,
            Destination destination,
            Long referenceId,
            String title,
            String message) {

        if (userId == null) {
            return;
        }

        User user = userRepository.findById(userId).orElse(null);

        if (user == null || !user.isActive()) {
            return;
        }

        AppNotification item = new AppNotification();
        item.setUserId(userId);
        item.setDestination(destination.name());
        item.setReferenceId(referenceId);
        item.setTitle(title);
        item.setMessage(message);
        item.setCreatedAt(LocalDateTime.now());

        appNotificationRepository.save(item);

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            events.publishEvent(
                    new EmailRequested(
                            user.getEmail(),
                            title,
                            message,
                            destination.path(referenceId)
                    )
            );
        }
    }
}
