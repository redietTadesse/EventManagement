package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.services.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notifications;

    @GetMapping
    public NotificationService.Inbox inbox(@AuthenticationPrincipal UserDetails user) {
        return notifications.inbox(user.getUsername());
    }

    @PatchMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        notifications.markRead(user.getUsername(), id);
    }

    @PatchMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(@AuthenticationPrincipal UserDetails user) {
        notifications.markAllRead(user.getUsername());
    }
}
