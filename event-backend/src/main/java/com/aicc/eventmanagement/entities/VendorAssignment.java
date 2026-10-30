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

    /**
     * Nullable: an OPEN row is an offer to the whole pool and has no vendor yet.
     *
     * Previously this was non-null, which forced the exhaustion path to recycle the
     * declining vendor's own row into the pool. The claim then overwrote vendor_id
     * and that vendor's decline was lost from the history entirely.
     */
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

    /**
     * The ranking score this vendor had when it was chosen, in [0, 1].
     * Null for attempts that bypassed ranking (client-preferred, coordinator-assigned,
     * pool rows that nobody has claimed).
     */
    @Column(name = "ranking_score")
    private Double rankingScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "selection_reason", length = 40)
    private SelectionReason selectionReason;

    /** JSON snapshot of the candidates and exclusions at the time of auto-selection. */
    @Column(name = "decision_snapshot", columnDefinition = "TEXT")
    private String decisionSnapshot;

    /** When this offer stops being valid. Null means it never expires. */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /**
     * When a vendor was attached to this row. Deliberately NOT @CreationTimestamp:
     * an OPEN row is created with no vendor and gets one later, so the two timestamps
     * genuinely differ. createdAt below is when the row appeared.
     */
    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    /**
     * When the vendor actually answered. Deliberately NOT @UpdateTimestamp, which
     * fires on every save and made this column mean "last modified" instead. Rating
     * an assignment weeks later used to move its response time.
     */
    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(columnDefinition = "TEXT")
    private String declineReason;

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
