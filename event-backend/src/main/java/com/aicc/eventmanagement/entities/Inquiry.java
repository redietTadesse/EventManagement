package com.aicc.eventmanagement.entities;

import com.aicc.eventmanagement.enums.EventStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "inquiries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Client ID is required")
    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @NotBlank(message = "Client name is required")
    @Size(max = 100, message = "Client name must not exceed 100 characters")
    @Column(name = "client_name", nullable = false)
    private String clientName;

    @NotBlank(message = "Event type is required")
    @Size(max = 50, message = "Event type must not exceed 50 characters")
    @Column(name = "event_type", nullable = false)
    private String eventType;

    @NotNull(message = "Event date is required")
    @Future(message = "Event date must be in the future")
    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @NotNull(message = "Expected attendees is required")
    @Min(value = 1, message = "At least 1 attendee required")
    @Column(name = "expected_attendees", nullable = false)
    private Integer expectedAttendees;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status;

    @Column(name = "requested_categories", columnDefinition = "TEXT")
    private String requestedCategories;

    @Column(name = "categories", columnDefinition = "TEXT")
    private String categories;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "proposal", columnDefinition = "JSON")
    private String proposal;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferred_vendor_ids", columnDefinition = "JSON")
    private String preferredVendorIds;

    @OneToOne(mappedBy = "inquiry", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Event event;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}