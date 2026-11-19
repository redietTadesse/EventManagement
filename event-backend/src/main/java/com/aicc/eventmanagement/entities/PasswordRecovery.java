package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name = "password_recoveries") @Getter @Setter
public class PasswordRecovery {
    @Id private Long userId;
    @Column(nullable = false, unique = true, length = 64) private String tokenHash;
    @Column(nullable = false) private Instant requestedAt;
    @Column(nullable = false) private Instant expiresAt;
}
