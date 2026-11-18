package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorApplicationStatus;
import com.aicc.eventmanagement.payload.JwtResponse;
import com.aicc.eventmanagement.payload.LoginRequest;
import com.aicc.eventmanagement.payload.SignupRequest;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorApplicationRepository;
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
    VendorApplicationRepository vendorApplicationRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        User user = userRepository.findByUsername(loginRequest.getUsername()).orElse(null);

        if (user == null && isPendingVendorApplicant(loginRequest)) {
            return ResponseEntity.status(403).body(
                    "Your vendor application is still awaiting approval. You can sign in once an administrator approves it.");
        }

        if (user == null || !encoder.matches(loginRequest.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.badRequest().body("Error: Invalid username or password!");
        }
        if (!user.isActive()) return ResponseEntity.status(403).body("This account is inactive. Contact the administrator.");

        String jwt = jwtUtils.generateJwtToken(user.getUsername(), user.getRole().name());
        return ResponseEntity.ok(new JwtResponse(jwt, user.getRole().name()));
    }

    // Only true when the password also matches, so this cannot be used to discover who has applied.
    private boolean isPendingVendorApplicant(LoginRequest loginRequest) {
        if (loginRequest.getUsername() == null || loginRequest.getPassword() == null) {
            return false;
        }
        return vendorApplicationRepository
                .findFirstByUsernameAndStatus(loginRequest.getUsername(), VendorApplicationStatus.PENDING)
                .filter(a -> encoder.matches(loginRequest.getPassword(), a.getPasswordHash()))
                .isPresent();
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