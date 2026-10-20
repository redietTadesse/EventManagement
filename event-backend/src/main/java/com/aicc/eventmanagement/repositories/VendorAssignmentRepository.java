package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VendorAssignmentRepository extends JpaRepository<VendorAssignment, Long> {

    List<VendorAssignment> findByEventId(Long eventId);

    List<VendorAssignment> findByVendorId(Long vendorId);

    List<VendorAssignment> findByStatus(VendorAssignmentStatus status);

    @Query("SELECT va FROM VendorAssignment va WHERE va.event.id = :eventId AND va.serviceCategory = :category")
    List<VendorAssignment> findByEventIdAndServiceCategory(@Param("eventId") Long eventId, @Param("category") String category);

    @Query("SELECT va FROM VendorAssignment va WHERE va.vendor.id = :vendorId AND va.status = :status")
    List<VendorAssignment> findByVendorIdAndStatus(@Param("vendorId") Long vendorId, @Param("status") VendorAssignmentStatus status);

    @Query("SELECT va FROM VendorAssignment va WHERE va.status = 'PENDING' AND va.assignedAt < :cutoffDate")
    List<VendorAssignment> findPendingAssignmentsOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);

    @Query("SELECT va FROM VendorAssignment va WHERE va.status = :status AND va.serviceCategory = :category")
    List<VendorAssignment> findByStatusAndServiceCategory(@Param("status") VendorAssignmentStatus status, @Param("category") String category);

    @Query("SELECT va FROM VendorAssignment va " +
           "WHERE va.status = 'OPEN' AND va.serviceCategory = :category " +
           "AND va.event.status NOT IN :deadStatuses")
    List<VendorAssignment> findOpenAssignmentsForCategory(
            @Param("category") String category,
            @Param("deadStatuses") List<com.aicc.eventmanagement.enums.EventStatus> deadStatuses);

    /**
     * Atomic claim of an OPEN assignment.
     *
     * Native SQL because JPQL does not allow an association path (va.vendor.id) in an
     * UPDATE SET clause. The update also stamps vendor_name and responded_at so the row
     * is fully consistent after a single statement; the WHERE status = 'OPEN' guard makes
     * the claim atomic, so concurrent vendors cannot both win (the loser gets 0 rows).
     *
     * clearAutomatically/flushAutomatically force the persistence context to be flushed
     * before and detached after the update, so the caller's re-read sees the new row
     * instead of the stale pre-claim state cached in the first-level cache.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE vendor_assignments SET status = 'PENDING', vendor_id = :vendorId, " +
            "vendor_name = (SELECT company_name FROM vendors WHERE id = :vendorId), " +
            "responded_at = NOW() " +
            "WHERE id = :assignmentId AND status = 'OPEN'",
            nativeQuery = true)
    int claimOpenAssignment(@Param("assignmentId") Long assignmentId, @Param("vendorId") Long vendorId);

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

    /**
     * Workload per vendor, used by findBestVendor / autoReassign for load balancing.
     * Counts PENDING as well as ACCEPTED: a vendor already holding a pending offer is
     * load, and ignoring it would keep handing every new event to the same vendor.
     */
    @Query("SELECT va.vendor.id, COUNT(va) FROM VendorAssignment va " +
            "WHERE va.vendor.id IN :vendorIds " +
            "AND va.status IN ('ACCEPTED', 'PENDING') " +
            "GROUP BY va.vendor.id")
    List<Object[]> countActiveAssignmentsByVendors(@Param("vendorIds") List<Long> vendorIds);

    @Query("SELECT COUNT(va) FROM VendorAssignment va " +
            "WHERE va.vendor.id = :vendorId " +
            "AND va.status IN ('ACCEPTED', 'PENDING')")
    long countActiveAndPendingByVendor(@Param("vendorId") Long vendorId);

    /**
     * Whether a vendor declined an assignment in the given category recently
     * (last 30 days from the caller-supplied cutoff). Used by the conversion
     * preview to warn coordinators that the top-ranked vendor may decline again.
     */
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

    @Query("SELECT COUNT(va) > 0 FROM VendorAssignment va " +
            "WHERE va.event.id = :eventId " +
            "AND va.serviceCategory = :category")
    boolean existsByEventIdAndServiceCategory(
            @Param("eventId") Long eventId,
            @Param("category") String category
    );

    @Query("SELECT DISTINCT va.vendor.id FROM VendorAssignment va " +
            "WHERE va.event.id = :eventId AND va.serviceCategory = :category")
    List<Long> findTriedVendorIds(@Param("eventId") Long eventId,
                                  @Param("category") String category);

    @Query("SELECT va FROM VendorAssignment va " +
            "JOIN va.event e " +
            "JOIN e.inquiry i " +
            "WHERE i.eventDate BETWEEN :startDate AND :endDate " +
            "AND va.status IN ('PENDING', 'ACCEPTED', 'COMPLETED')")
    List<VendorAssignment> findActiveAssignmentsInDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);};