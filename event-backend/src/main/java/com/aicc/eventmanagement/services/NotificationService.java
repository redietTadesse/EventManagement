
package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Notification;
import com.aicc.eventmanagement.entities.AppNotification;
import com.aicc.eventmanagement.entities.AppNotification.Destination;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.NotificationType;
import com.aicc.eventmanagement.exceptions.NotificationNotFoundException;
import com.aicc.eventmanagement.payload.NotificationResponse;
import com.aicc.eventmanagement.repositories.NotificationRepository;
import com.aicc.eventmanagement.repositories.AppNotificationRepository;
import com.aicc.eventmanagement.repositories.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    // Feature branch's notification implementation
    private final NotificationRepository notificationRepository;

    // Main branch's existing notification dependencies
    private final AppNotificationRepository appNotificationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher events;

    public record EmailRequested(
            String recipient,
            String title,
            String message,
            String path
    ) {}

    // FEATURE BRANCH: Create notification
    @Transactional
    public Notification create(
            Long recipientId,
            NotificationType type,
            String title,
            String message,
            Long referenceId) {

        Notification n = Notification.builder()
                .recipientId(recipientId)
                .type(type)
                .title(title)
                .message(message)
                .referenceId(referenceId)
                .read(false)
                .build();

        return notificationRepository.save(n);
    }

    // FEATURE BRANCH: Paginated notifications
    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(
            Long recipientId,
            Pageable pageable) {

        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(
                        recipientId,
                        pageable
                )
                .map(NotificationResponse::from);
    }

    // FEATURE BRANCH: Unread count
    @Transactional(readOnly = true)
    public long unreadCount(Long recipientId) {
        return notificationRepository
                .countByRecipientIdAndReadFalse(recipientId);
    }

    // FEATURE BRANCH: Mark one notification as read
    @Transactional
    public void markRead(Long id, Long recipientId) {

        Notification n = notificationRepository
                .findByIdAndRecipientId(id, recipientId)
                .orElseThrow(
                        () -> new NotificationNotFoundException(id)
                );

        if (!n.isRead()) {
            n.setRead(true);
            notificationRepository.save(n);
        }
    }

    // FEATURE BRANCH: Mark all as read
    @Transactional
    public void markAllRead(Long recipientId) {
        notificationRepository.markAllRead(recipientId);
    }

    // MAIN BRANCH: Preserve existing notification creation
    // and email event publishing for compatibility.
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
