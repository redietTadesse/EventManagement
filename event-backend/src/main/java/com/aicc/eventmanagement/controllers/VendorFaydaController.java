package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.services.FaydaSandboxService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/vendors/me/fayda")
@PreAuthorize("hasRole('VENDOR')")
@RequiredArgsConstructor
public class VendorFaydaController {
    private final FaydaSandboxService fayda;
    private final UserRepository users;

    public record Status(boolean enabled, Instant verifiedAt) {}
    public record Completion(String code, String state, String ticket) {}

    @GetMapping
    public Status status(@AuthenticationPrincipal UserDetails principal) {
        return status(vendor(principal));
    }

    @PostMapping("/start")
    public FaydaSandboxService.Journey start(@AuthenticationPrincipal UserDetails principal) {
        return fayda.begin(vendor(principal).getUsername());
    }

    @PostMapping("/complete")
    public Status complete(@AuthenticationPrincipal UserDetails principal, @RequestBody Completion completion) {
        User user = vendor(principal);
        fayda.verify(user.getUsername(), completion.code(), completion.state(), completion.ticket());
        if (users.recordFaydaSandboxVerification(user.getId(), Instant.now(), Role.VENDOR) != 1) {
            throw new AccessDeniedException("An active vendor account is required.");
        }
        return status(vendor(principal));
    }

    private Status status(User user) {
        return new Status(fayda.enabled(), user.getFaydaSandboxVerifiedAt());
    }

    private User vendor(UserDetails principal) {
        return users.findByUsername(principal.getUsername()).filter(user -> user.isActive() && user.getRole() == Role.VENDOR)
                .orElseThrow(() -> new AccessDeniedException("A vendor account is required."));
    }
}
