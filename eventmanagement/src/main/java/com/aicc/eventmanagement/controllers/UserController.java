package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.payload.UserResponse;
import com.aicc.eventmanagement.repositories.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "User Management", description = "Endpoints for the current authenticated user")
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    @Operation(summary = "Get current user", description = "Returns the authenticated user's profile (id, role, name)")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByUsername(principal.getUsername());
        if (user == null) {
            throw new RuntimeException("User not found");
        }
        log.info("Fetching profile for user: {}", user.getUsername());
        return ResponseEntity.ok(UserResponse.from(user));
    }
}