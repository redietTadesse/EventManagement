package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name="availability_watches") @Getter @Setter
public class AvailabilityWatch {
    public enum Status { WAITING, NOTIFIED, CANCELLED, CLOSED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, unique=true) private Long inquiryId;
    @Column(nullable=false) private Long clientId;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private Status status;
    @Column(nullable=false) private Instant createdAt;
    private Instant notifiedAt;
    @Column(nullable=false) private Instant nextCheckAt;
    private Long matchedVenueId;
    private String matchedVenueName;
}
