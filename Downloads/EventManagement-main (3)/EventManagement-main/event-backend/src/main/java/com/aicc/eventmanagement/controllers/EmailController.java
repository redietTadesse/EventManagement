package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.services.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin endpoint for viewing email log during testing/demo.
 * In production, this would be removed or secured differently.
 */
@RestController
@RequestMapping("/api/v1/admin/emails")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Email Testing", description = "Email log viewing for testing purposes")
public class EmailController {

    private final EmailService emailService;

    @GetMapping("/log")
    @Operation(summary = "Get email log", description = "Returns list of emails that would have been sent (for testing)")
    public ResponseEntity<List<String>> getEmailLog() {
        return ResponseEntity.ok(emailService.getEmailLog());
    }

    @DeleteMapping("/log")
    @Operation(summary = "Clear email log", description = "Clears the email log")
    public ResponseEntity<Void> clearEmailLog() {
        emailService.clearEmailLog();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status")
    @Operation(summary = "Get email service status", description = "Returns whether email sending is enabled")
    public ResponseEntity<Map<String, Object>> getEmailStatus() {
        return ResponseEntity.ok(Map.of(
                "enabled", emailService.isEmailEnabled(),
                "logSize", emailService.getEmailLog().size()
        ));
    }
}
