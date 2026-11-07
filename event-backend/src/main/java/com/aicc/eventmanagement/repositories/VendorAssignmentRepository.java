
package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VendorAssignmentRepository extends JpaRepository<VendorAssignment, Long> {

    // OVERRIDE findById to fix the single assignment view crash
    @EntityGraph(attributePaths = {"event", "event.inquiry", "vendor"})
    Optional<VendorAssignment> findById(Long id);

    @EntityGraph(attributePaths = {"event", "event.inquiry", "vendor"})
    List<VendorAssignment> findByEventId(Long eventId);

    @EntityGraph(attributePaths = {"event", "event.inquiry", "vendor"})
    List<VendorAssignment> findByVendorId(Long vendorId);

    List<VendorAssignment> findByStatus(VendorAssignmentStatus status);

    @EntityGraph(attributePaths = {"event", "event.inquiry", "vendor"})
    @Query("SELECT va FROM VendorAssignment va WHERE va.event.id = :eventId AND va.serviceCategory = :category")
    List<VendorAssignment> findByEventIdAndServiceCategory(
            @Param("eventId") Long eventId,
            @Param("category") String category
    );

    @EntityGraph(attributePaths = {"event", "event.inquiry", "vendor"})
    @Query("SELECT va FROM VendorAssignment va WHERE va.vendor.id = :vendorId AND va.status = :status")
    List<VendorAssignment> findByVendorIdAndStatus(
            @Param("vendorId") Long vendorId,
            @Param("status") VendorAssignmentStatus status
    );

    @Query("SELECT va FROM VendorAssignment va WHERE va.status = 'PENDING' AND va.assignedAt < :cutoffDate")
    List<VendorAssignment> findPendingAssignmentsOlderThan(
            @Param("cutoffDate") LocalDateTime cutoffDate
    );

    @Query("SELECT va FROM VendorAssignment va WHERE va.status = 'PENDING' AND va.expiresAt < :now")
    List<VendorAssignment> findExpiredPendingOffers(
            @Param("now") LocalDateTime now
    );

    @Query("SELECT va FROM VendorAssignment va WHERE va.status = :status AND va.serviceCategory = :category")
    List<VendorAssignment> findByStatusAndServiceCategory(
            @Param("status") VendorAssignmentStatus status,
            @Param("category") String category
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value = "UPDATE vendor_assignments SET status = 'PENDING', vendor_id = :vendorId, " +
                    "vendor_name = (SELECT company_name FROM vendors WHERE id = :vendorId), " +
                    "responded_at = NOW(), expires_at = :expiresAt " +
                    "WHERE id = :assignmentId AND status = 'OPEN'",
            nativeQuery = true
    )
    int claimOpenAssignment(
            @Param("assignmentId") Long assignmentId,
            @Param("vendorId") Long vendorId,
            @Param("expiresAt") LocalDateTime expiresAt
    );

    @Query("SELECT COUNT(va) FROM VendorAssignment va WHERE va.vendor.id = :vendorId AND va.status = 'ACCEPTED'")
    long countActiveAssignmentsByVendor(@Param("vendorId") Long vendorId);

    @Query("SELECT COUNT(va) FROM VendorAssignment va WHERE va.vendor.id = :vendorId AND va.status IN ('ACCEPTED', 'PENDING')")
    long countTotalAssignmentsByVendor(@Param("vendorId") Long vendorId);

    boolean existsByEventIdAndVendorId(Long eventId, Long vendorId);

    @Query("SELECT COUNT(va) > 0 FROM VendorAssignment va " +
            "JOIN va.event e " +
            "JOIN e.inquiry i " +
            "WHERE va.vendor.id = :vendorId " +
            "AND va.status = 'ACCEPTED' " +
            "AND i.eventDate = :date")
    boolean hasActiveAssignmentOnDate(
            @Param("vendorId") Long vendorId,
            @Param("date") LocalDate date
    );

    @Query("SELECT COUNT(va) > 0 FROM VendorAssignment va " +
            "JOIN va.event e " +
            "JOIN e.inquiry i " +
            "WHERE va.vendor.id = :vendorId " +
            "AND va.status = 'ACCEPTED' " +
            "AND i.eventDate = :date " +
            "AND va.event.id != :eventId")
    boolean hasActiveAssignmentOnDateExcludingEvent(
            @Param("vendorId") Long vendorId,
            @Param("date") LocalDate date,
            @Param("eventId") Long eventId
    );

    @Query("SELECT va.vendor.id, COUNT(va) FROM VendorAssignment va " +
            "WHERE va.vendor.id IN :vendorIds " +
            "AND va.status IN ('ACCEPTED', 'PENDING') " +
            "GROUP BY va.vendor.id")
    List<Object[]> countActiveAssignmentsByVendors(@Param("vendorIds") List<Long> vendorIds);

    @Query("SELECT va.vendor.id, COUNT(va) FROM VendorAssignment va " +
            "WHERE va.vendor.id IN :vendorIds " +
            "GROUP BY va.vendor.id")
    List<Object[]> countAllAssignmentsByVendors(@Param("vendorIds") List<Long> vendorIds);

    @Query("SELECT COUNT(va) FROM VendorAssignment va " +
            "WHERE va.vendor.id = :vendorId " +
            "AND va.status IN ('ACCEPTED', 'PENDING')")
    long countActiveAndPendingByVendor(@Param("vendorId") Long vendorId);

    @Query("SELECT COUNT(va) > 0 FROM VendorAssignment va " +
            "WHERE va.event.id = :eventId " +
            "AND va.serviceCategory = :category")
    boolean existsByEventIdAndServiceCategory(
            @Param("eventId") Long eventId,
            @Param("category") String category
    );

    @Query("SELECT va FROM VendorAssignment va " +
            "WHERE va.status = 'OPEN' " +
            "AND va.serviceCategory = :category " +
            "AND va.event.status NOT IN :deadStatuses")
    List<VendorAssignment> findOpenAssignmentsForCategory(
            @Param("category") String category,
            @Param("deadStatuses") List<EventStatus> deadStatuses
    );

    @Query("SELECT va.vendor.id FROM VendorAssignment va " +
            "WHERE va.event.id = :eventId " +
            "AND va.serviceCategory = :category " +
            "AND va.vendor.id IS NOT NULL")
    List<Long> findTriedVendorIds(
            @Param("eventId") Long eventId,
            @Param("category") String category
    );

    @Query("SELECT va.vendor.id, AVG(va.vendorRating) FROM VendorAssignment va " +
            "WHERE va.vendor.id IN :vendorIds " +
            "AND va.status = 'COMPLETED' " +
            "AND va.vendorRating IS NOT NULL " +
            "GROUP BY va.vendor.id")
    List<Object[]> averageCompletedRatingsByVendors(
            @Param("vendorIds") List<Long> vendorIds
    );

    @Query("SELECT COUNT(va) > 0 FROM VendorAssignment va " +
            "WHERE va.vendor.id = :vendorId " +
            "AND va.serviceCategory = :category " +
            "AND va.status = 'DECLINED' " +
            "AND va.respondedAt >= :cutoff")
    boolean existsRecentDeclineByVendorAndCategory(
            @Param("vendorId") Long vendorId,
            @Param("category") String category,
            @Param("cutoff") LocalDateTime cutoff
    );

    @EntityGraph(attributePaths = {"event", "event.inquiry", "vendor"})
    @Query("SELECT va FROM VendorAssignment va " +
            "JOIN va.event e " +
            "JOIN e.inquiry i " +
            "WHERE i.eventDate BETWEEN :startDate AND :endDate " +
            "AND va.status IN ('PENDING', 'ACCEPTED', 'COMPLETED')")
    List<VendorAssignment> findActiveAssignmentsInDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
