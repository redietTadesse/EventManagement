package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "venue_unavailable_dates", uniqueConstraints = @UniqueConstraint(
        name = "uk_venue_unavailable_date", columnNames = {"venue_id", "unavailable_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VenueUnavailableDate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @Column(name = "unavailable_date", nullable = false)
    private LocalDate unavailableDate;

    @Size(max = 500)
    @Column(length = 500)
    private String reason;
}
