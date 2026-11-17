package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.PostEventReport;
import com.aicc.eventmanagement.enums.IncidentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PostEventReportRepository extends JpaRepository<PostEventReport, Long> {
    // Check for 3 strikes
    long countByVendorIdAndIncidentType(Long vendorId, IncidentType incidentType);

    // Get recent incidents for ranking penalty
    List<PostEventReport> findByVendorIdAndCreatedAtAfter(Long vendorId, LocalDateTime cutoff);
}