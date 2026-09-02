package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.VendorBookedDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface VendorBookedDateRepository extends JpaRepository<VendorBookedDate, Long> {

    List<VendorBookedDate> findByVendorId(Long vendorId);

    @Query("SELECT vbd FROM VendorBookedDate vbd WHERE vbd.vendor.id = :vendorId AND vbd.bookedDate = :date")
    VendorBookedDate findByVendorIdAndDate(@Param("vendorId") Long vendorId, @Param("date") LocalDate date);

    @Query("SELECT vbd FROM VendorBookedDate vbd WHERE vbd.vendor.id = :vendorId AND vbd.bookedDate BETWEEN :startDate AND :endDate")
    List<VendorBookedDate> findByVendorIdAndDateRange(@Param("vendorId") Long vendorId, 
                                                       @Param("startDate") LocalDate startDate, 
                                                       @Param("endDate") LocalDate endDate);

    boolean existsByVendorIdAndBookedDate(Long vendorId, LocalDate date);

    @Transactional
    void deleteByVendorId(Long vendorId);
}