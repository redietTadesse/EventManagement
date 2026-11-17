package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "coordinator_assignment_history")
@Getter @Setter @NoArgsConstructor
public class CoordinatorAssignmentHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inquiry_id", nullable = false)
    private Inquiry inquiry;
    private Long previousCoordinatorId;
    private String previousCoordinatorName;
    @Column(nullable = false)
    private Long coordinatorId;
    @Column(nullable = false)
    private String coordinatorName;
    @Column(nullable = false)
    private Long changedById;
    @Column(nullable = false)
    private String changedByName;
    @Column(nullable = false, length = 1000)
    private String reason;
    @Column(nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();
}
