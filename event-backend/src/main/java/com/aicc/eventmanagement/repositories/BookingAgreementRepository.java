package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.BookingAgreement;
import com.aicc.eventmanagement.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public interface BookingAgreementRepository extends JpaRepository<BookingAgreement, Long> {
    interface VerifiedPayment {
        String getTermsSnapshot();
        Instant getVerifiedAt();
    }

    interface OutstandingContract {
        String getTermsSnapshot();
        Instant getReceiptUploadedAt();
        String getRejectionReason();
    }

    @Query("""
            select a.termsSnapshot as termsSnapshot, a.verifiedAt as verifiedAt
            from BookingAgreement a where a.verifiedAt >= :from and a.verifiedAt <= :through
            """)
    List<VerifiedPayment> findVerifiedForReport(@Param("from") Instant from, @Param("through") Instant through);

    @Query("""
            select a.termsSnapshot as termsSnapshot, a.receiptUploadedAt as receiptUploadedAt,
                   a.rejectionReason as rejectionReason
            from BookingAgreement a, Inquiry i
            where i.id = a.inquiryId and i.status = :status and i.eventDate >= :today
                and a.verifiedAt is null and a.clientSignedAt is not null and a.coordinatorSignedAt is not null
            """)
    List<OutstandingContract> findOutstandingForReport(@Param("today") LocalDate today,
                                                        @Param("status") EventStatus status);
}
