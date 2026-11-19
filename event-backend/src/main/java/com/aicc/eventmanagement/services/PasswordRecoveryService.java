package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.PasswordRecovery;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.repositories.PasswordRecoveryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service @RequiredArgsConstructor
public class PasswordRecoveryService {
    private final UserRepository users;
    private final PasswordRecoveryRepository recoveries;
    private final PasswordEncoder encoder;
    private final ApplicationEventPublisher events;
    private final SecureRandom random = new SecureRandom();
    public record Requested(String email) {}

    @Transactional
    public void request(String email) {
        // Lookup happens asynchronously, keeping the public response independent
        // of whether the supplied address belongs to an account.
        events.publishEvent(new Requested(email.strip()));
    }

    @Transactional
    public void sendLink(String email) {
        var account = users.findByEmailIgnoreCase(email).orElse(null);
        if (account == null) return;
        var user = users.findForPasswordUpdate(account.getId()).orElse(null);
        if (user == null || !user.isActive()) return;
        Instant now = Instant.now();
        var recovery = recoveries.findForUpdate(user.getId()).orElseGet(PasswordRecovery::new);
        if (recovery.getRequestedAt() != null && recovery.getRequestedAt().plus(Duration.ofMinutes(5)).isAfter(now)) return;
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        recovery.setUserId(user.getId()); recovery.setTokenHash(hash(token));
        recovery.setRequestedAt(now); recovery.setExpiresAt(now.plus(Duration.ofMinutes(30)));
        recoveries.save(recovery);
        events.publishEvent(new NotificationService.EmailRequested(user.getEmail(), "Reset your AICC password",
                "A password reset was requested for your AICC account. This link expires in 30 minutes and can be used once."
                        + " If you did not request this, ignore this email; your password has not changed.",
                "/reset-password#token=" + token));
    }

    @Transactional
    public void reset(String token, String password) {
        Long userId = recoveries.findUserIdByTokenHash(hash(token)).orElseThrow(this::invalid);
        // All requests lock the user first. Concurrent requests cannot consume a
        // link twice or issue a second valid link during the same cooldown.
        var user = users.findForPasswordUpdate(userId).orElseThrow(this::invalid);
        var recovery = recoveries.findForUpdate(user.getId()).orElseThrow(this::invalid);
        if (!user.isActive() || !recovery.getTokenHash().equals(hash(token)) || !recovery.getExpiresAt().isAfter(Instant.now()))
            throw invalid();
        user.setPasswordHash(encoder.encode(password));
        user.setTokenVersion(user.getTokenVersion() + 1);
        users.save(user); recoveries.delete(recovery);
        events.publishEvent(new NotificationService.EmailRequested(user.getEmail(), "Your AICC password changed",
                "Your password was reset and previous sign-in sessions were ended. Sign in using your new password."
                        + " If you did not make this change, contact AICC immediately.", "/login"));
    }

    private BusinessException invalid() { return new BusinessException("This reset link is invalid or has expired. Request a new link.", "INVALID_RESET_LINK"); }
    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
