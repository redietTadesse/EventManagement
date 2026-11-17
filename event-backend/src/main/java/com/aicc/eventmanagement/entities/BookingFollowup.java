package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "booking_followups")
@Getter @Setter
public class BookingFollowup {
    @Id private Long inquiryId;
    @Column(nullable = false, length = 64) private String stageToken;
    @Column(nullable = false, length = 40) private String stage;
    @Column(nullable = false) private Instant startedAt;
    private Instant firstSentAt;
    private Instant lastSentAt;
    private Instant nextAt;
    private int sentCount;
    private Instant escalatedAt;
    private boolean paused;
}
