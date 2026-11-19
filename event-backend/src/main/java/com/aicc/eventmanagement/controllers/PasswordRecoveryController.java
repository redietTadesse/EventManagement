package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.services.PasswordRecoveryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class PasswordRecoveryController {
    private final PasswordRecoveryService recovery;
    private final Map<String, Window> requests = new HashMap<>();
    private record Window(Instant start, int count) {}
    public record Forgot(@NotBlank @Email @Size(max=254) String email) {}
    public record Reset(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token,
                        @NotBlank @Pattern(regexp="[ -~]{12,72}", message="Use 12–72 printable characters for your password.") String password) {}

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String,String>> forgot(@Valid @RequestBody Forgot body, HttpServletRequest request) {
        if (allow(request.getRemoteAddr())) recovery.request(body.email());
        return ResponseEntity.accepted().header("Cache-Control", "no-store").body(Map.of("message",
                "If an active account uses this address, a reset link will be emailed. Please allow a few minutes and check spam."));
    }
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String,String>> reset(@Valid @RequestBody Reset body) {
        recovery.reset(body.token(), body.password());
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(Map.of("message", "Password updated. Sign in with your new password."));
    }
    private synchronized boolean allow(String address) {
        Instant now = Instant.now();
        requests.entrySet().removeIf(entry -> entry.getValue().start().plusSeconds(900).isBefore(now));
        Window window = requests.get(address);
        if (window == null && requests.size() >= 10000) return false;
        if (window != null && window.count() >= 10) return false;
        requests.put(address, new Window(window == null ? now : window.start(), window == null ? 1 : window.count()+1));
        return true;
    }
}
