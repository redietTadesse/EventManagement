package com.aicc.eventmanagement.entities;

import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "transition_history", indexes = {
        @Index(name = "idx_history_reference", columnList = "reference_type,reference_id"),
        @Index(name = "idx_history_occurred_at", columnList = "occurred_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransitionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_id", nullable = false, length = 100)
    private String referenceId;

    @Column(name = "reference_type", nullable = false, length = 20)
    private String referenceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false, length = 50)
    private EventStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 50)
    private EventStatus toStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "triggered_by", nullable = false, length = 20)
    private Role triggeredBy;

    @Column(name = "performed_by_username", length = 100)
    private String performedByUsername;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @CreationTimestamp
    @Column(name = "occurred_at", updatable = false)
    private LocalDateTime occurredAt;
}