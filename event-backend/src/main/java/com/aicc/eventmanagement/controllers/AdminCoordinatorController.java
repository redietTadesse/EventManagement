package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.repositories.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/coordinators")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminCoordinatorController {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    @GetMapping
    public List<Coordinator> list() {
        return users.findByRoleOrderByUsernameAsc(Role.COORDINATOR).stream()
                .map(Coordinator::from).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateCoordinator request) {
        String email = request.email().trim();
        if (users.existsByUsername(request.username())) {
            return conflict("That username is already in use.");
        }
        if (users.existsByEmail(email)) {
            return conflict("That email address is already in use.");
        }

        User user = User.builder()
                .fullName(request.fullName().trim())
                .username(request.username())
                .email(email)
                .passwordHash(encoder.encode(request.password()))
                .role(Role.COORDINATOR)
                .build();
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(Coordinator.from(users.save(user)));
        } catch (DataIntegrityViolationException ex) {
            return conflict("That username or email address is already in use.");
        }
    }

    private ResponseEntity<?> conflict(String message) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
    }

    public record CreateCoordinator(
            @NotBlank @Size(max = 100) String fullName,
            @NotBlank @Pattern(regexp = "[a-zA-Z0-9._-]{3,50}") String username,
            @NotBlank @Email @Size(max = 100) String email,
            @NotBlank @Pattern(regexp = "[ -~]{12,72}") String password) {}

    public record Coordinator(Long id, String fullName, String username, String email) {
        static Coordinator from(User user) {
            return new Coordinator(user.getId(), user.getFullName(), user.getUsername(), user.getEmail());
        }
    }
}
