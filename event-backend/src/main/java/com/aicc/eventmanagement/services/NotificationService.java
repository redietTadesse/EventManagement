package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Notification;
import com.aicc.eventmanagement.enums.NotificationType;
import com.aicc.eventmanagement.exceptions.NotificationNotFoundException;
import com.aicc.eventmanagement.payload.NotificationResponse;
import com.aicc.eventmanagement.repositories.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public Notification create(Long recipientId, NotificationType type,
                               String title, String message, Long referenceId) {
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

    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(Long recipientId, Pageable pageable) {
        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(recipientId, pageable)
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long recipientId) {
        return notificationRepository.countByRecipientIdAndReadFalse(recipientId);
    }

    @Transactional
    public void markRead(Long id, Long recipientId) {
        Notification n = notificationRepository.findByIdAndRecipientId(id, recipientId)
                .orElseThrow(() -> new NotificationNotFoundException(id));
        if (!n.isRead()) {
            n.setRead(true);
            notificationRepository.save(n);
        }
    }

    @Transactional
    public void markAllRead(Long recipientId) {
        notificationRepository.markAllRead(recipientId);
    }
}