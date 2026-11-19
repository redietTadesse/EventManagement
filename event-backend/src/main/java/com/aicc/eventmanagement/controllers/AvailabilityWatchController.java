package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.services.AvailabilityWatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/inquiries/{id}/availability-watch") @RequiredArgsConstructor
@PreAuthorize("hasRole('CLIENT')")
public class AvailabilityWatchController {
    private final AvailabilityWatchService watches;
    @GetMapping public AvailabilityWatchService.View get(@PathVariable Long id, Authentication user) { return watches.get(id, user.getName()); }
    @PostMapping public AvailabilityWatchService.View join(@PathVariable Long id, Authentication user) { return watches.subscribe(id, user.getName()); }
    @DeleteMapping public AvailabilityWatchService.View leave(@PathVariable Long id, Authentication user) { return watches.cancel(id, user.getName()); }
}
