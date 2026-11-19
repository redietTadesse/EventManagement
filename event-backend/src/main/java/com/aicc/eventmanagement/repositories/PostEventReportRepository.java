package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.PostEventReport;
import com.aicc.eventmanagement.enums.IncidentReportStatus;
import com.aicc.eventmanagement.enums.IncidentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PostEventReportRepository extends JpaRepository<PostEventReport, Long> {

    long countByVendorIdAndIncidentType(Long vendorId, IncidentType incidentType);

    List<PostEventReport> findByVendorIdAndCreatedAtAfter(Long vendorId, LocalDateTime cutoff);

    long countByVendorIdAndIncidentTypeAndStatus(
            Long vendorId, IncidentType incidentType, IncidentReportStatus status);

    boolean existsByEventIdAndVendorIdAndIncidentTypeAndStatus(
            Long eventId, Long vendorId, IncidentType incidentType, IncidentReportStatus status);

    boolean existsByEventIdAndVendorIdAndIncidentType(
            Long eventId, Long vendorId, IncidentType incidentType);

    List<PostEventReport> findByStatusOrderByCreatedAtAsc(IncidentReportStatus status);
}