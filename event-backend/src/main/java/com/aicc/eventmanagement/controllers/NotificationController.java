
package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.NotificationPage;
import com.aicc.eventmanagement.payload.NotificationResponse;
import com.aicc.eventmanagement.services.CurrentUserService;
import com.aicc.eventmanagement.services.NotificationService;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public NotificationPage list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Long userId = currentUserService.currentUserId();

        Page<NotificationResponse> result =
                notificationService.list(
                        userId,
                        PageRequest.of(
                                Math.max(page, 0),
                                Math.max(1, Math.min(size, 100))
                        )
                );

        return new NotificationPage(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.hasNext()
        );
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of(
                "unread",
                notificationService.unreadCount(
                        currentUserService.currentUserId()
                )
        );
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        notificationService.markRead(
                id,
                currentUserService.currentUserId()
        );

        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        notificationService.markAllRead(
                currentUserService.currentUserId()
        );

        return ResponseEntity.noContent().build();
    }
}
