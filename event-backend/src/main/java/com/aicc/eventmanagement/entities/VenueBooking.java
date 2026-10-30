package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "venue_bookings",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_venue_date",
                columnNames = {"venue_id", "booking_date"}
        ))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VenueBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    /**
     * Nullable: a HELD row is a coordinator reserving the date before any event
     * exists. The event is attached later when the hold converts to a booking.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private BookingStatus status = BookingStatus.CONFIRMED;

    /**
     * Only meaningful for HELD. Past this moment the hold stops blocking the date.
     * Expiry is enforced by filtering on this column, not by a cleanup job, so an
     * abandoned hold releases itself even if nothing ever runs.
     */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /** Username of the coordinator who placed the hold. Null for direct bookings. */
    @Column(name = "held_by")
    private String heldBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** True when this row is a hold that is still in force right now. */
    public boolean isActiveHold(LocalDateTime now) {
        return status == BookingStatus.HELD
                && expiresAt != null
                && expiresAt.isAfter(now);
    }

    /** True when this row no longer blocks its date and can be recycled. */
    public boolean isDead(LocalDateTime now) {
        return status == BookingStatus.CANCELLED
                || (status == BookingStatus.HELD && (expiresAt == null || !expiresAt.isAfter(now)));
    }

    public enum BookingStatus {
        CONFIRMED,
        HELD,
        CANCELLED
    }
}