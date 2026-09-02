package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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

    @Query("SELECT COUNT(va) FROM VendorAssignment va WHERE va.vendor.id = :vendorId AND va.status = 'ACCEPTED'")
    long countActiveAssignmentsByVendor(@Param("vendorId") Long vendorId);

    @Query("SELECT COUNT(va) FROM VendorAssignment va WHERE va.vendor.id = :vendorId AND va.status IN ('ACCEPTED', 'PENDING')")
    long countTotalAssignmentsByVendor(@Param("vendorId") Long vendorId);

    boolean existsByEventIdAndVendorId(Long eventId, Long vendorId);
}