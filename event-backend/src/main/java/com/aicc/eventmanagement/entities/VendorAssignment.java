package com.aicc.eventmanagement.entities;

import com.aicc.eventmanagement.enums.SelectionReason;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "vendor_assignments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @Size(max = 255, message = "Vendor name must not exceed 255 characters")
    @Column(name = "vendor_name")
    private String vendorName;

    @NotBlank(message = "Service category is required")
    @Size(max = 50, message = "Service category must not exceed 50 characters")
    @Column(name = "service_category", nullable = false)
    private String serviceCategory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VendorAssignmentStatus status;

    @Column(name = "ranking_score")
    private Double rankingScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "selection_reason", length = 40)
    private SelectionReason selectionReason;

    @Column(name = "decision_snapshot", columnDefinition = "TEXT")
    private String decisionSnapshot;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(columnDefinition = "TEXT")
    private String declineReason;

    @Column(name = "service_order", columnDefinition = "TEXT")
    private String serviceOrder;

    @Column(name = "vendor_rating")
    private Double vendorRating;

    @Column(name = "vendor_rating_comment", columnDefinition = "TEXT")
    private String vendorRatingComment;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}