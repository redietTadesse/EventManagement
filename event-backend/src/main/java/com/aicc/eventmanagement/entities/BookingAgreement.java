package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "booking_agreements")
@Getter
@Setter
public class BookingAgreement {
    @Id
    private Long inquiryId;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String termsSnapshot;
    private String clientSignature;
    private Instant clientSignedAt;
    private String coordinatorSignature;
    private Instant coordinatorSignedAt;
    private Long coordinatorSignedBy;
    @Basic(fetch = FetchType.LAZY)
    @Column(columnDefinition = "MEDIUMBLOB")
    private byte[] receipt;
    private String receiptType;
    private Instant receiptUploadedAt;
    @Column(length = 1000)
    private String rejectionReason;
    private Long verifiedBy;
    private Instant verifiedAt;
}
