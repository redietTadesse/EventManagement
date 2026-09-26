package com.aicc.eventmanagement.entities;

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
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;

    @NotBlank(message = "Vendor name is required")
    @Size(max = 255, message = "Vendor name must not exceed 255 characters")
    @Column(name = "vendor_name", nullable = false)
    private String vendorName;

    @NotBlank(message = "Service category is required")
    @Size(max = 50, message = "Service category must not exceed 50 characters")
    @Column(name = "service_category", nullable = false)
    private String serviceCategory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VendorAssignmentStatus status;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;

    @UpdateTimestamp
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