package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.payload.CreateUserRequest;
import com.aicc.eventmanagement.payload.UserResponse;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.services.UserManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "User Management", description = "Current-user profile and admin user management")
public class UserController {

    private final UserRepository userRepository;
    private final UserManagementService userManagementService;

    @GetMapping("/me")
    @Operation(summary = "Get current user", description = "Returns the authenticated user's profile (id, role, name)")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByUsername(principal.getUsername()).orElse(null);
        if (user == null) {
            throw new RuntimeException("User not found");
        }
        log.info("Fetching profile for user: {}", user.getUsername());
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all users (admin only)")
    public ResponseEntity<List<UserResponse>> getAll() {
        List<UserResponse> users = userManagementService.getAll().stream()
                .map(UserResponse::from)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a staff/user account (admin only)")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        UserResponse created = UserResponse.from(userManagementService.create(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate or deactivate a user (admin only)")
    public ResponseEntity<UserResponse> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(UserResponse.from(userManagementService.toggleActive(id)));
    }
}