package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.payload.JwtResponse;
import com.aicc.eventmanagement.payload.LoginRequest;
import com.aicc.eventmanagement.payload.SignupRequest;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
<<<<<<< HEAD
        User user = userRepository.findByUsername(loginRequest.getUsername())
        .orElseThrow(() -> new RuntimeException("User not found"));
=======
        User user = userRepository.findByUsername(loginRequest.getUsername()).orElse(null);
>>>>>>> 9502703f0f87f6cba525531ad2e81db07fd4834a

        if (user == null || !encoder.matches(loginRequest.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.badRequest().body("Error: Invalid username or password!");
        }

        String jwt = jwtUtils.generateJwtToken(user.getUsername(), user.getRole().name());
        return ResponseEntity.ok(new JwtResponse(jwt, user.getRole().name()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody SignupRequest signUpRequest) {
        // Public self-registration may only create CLIENT accounts.
        // Vendor and Coordinator accounts are provisioned by administration (see db/admin_seed.sql).
        if (signUpRequest.getRole() != Role.CLIENT) {
            return ResponseEntity.badRequest()
                    .body("Error: Only client accounts can self-register. Staff accounts are created by administration.");
        }

        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        User user = User.builder()
                .username(signUpRequest.getUsername())
                .email(signUpRequest.getEmail())
                .passwordHash(encoder.encode(signUpRequest.getPassword()))
                .fullName(signUpRequest.getFullName())
                .role(Role.CLIENT)
                .isActive(true)
                .build();

        userRepository.save(user);

        return ResponseEntity.ok("User registered successfully!");
    }
}