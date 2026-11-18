package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.PostEventReport;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.IncidentReportStatus;
import com.aicc.eventmanagement.enums.IncidentType;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.PostEventReportResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.PostEventReportRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncidentService {

    private final PostEventReportRepository reportRepository;
    private final EventRepository eventRepository;
    private final VendorRepository vendorRepository;
    private final VendorAssignmentRepository assignmentRepository;

    @Transactional
    public void submitReport(Long eventId, Long vendorId, IncidentType type, String notes) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));

        if (event.getStatus() != EventStatus.COMPLETED) {
            throw new BusinessException(
                    "Reports can only be filed after the event is COMPLETED",
                    "INVALID_STATE");
        }

        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new EntityNotFoundException("Vendor", vendorId));

        boolean assigned = assignmentRepository.findByEventId(eventId).stream()
                .anyMatch(a -> a.getVendor() != null
                        && a.getVendor().getId().equals(vendorId));
        if (!assigned) {
            throw new BusinessException(
                    "Vendor was not assigned to this event", "INVALID_STATE");
        }

        if (reportRepository.existsByEventIdAndVendorIdAndIncidentTypeAndStatus(
                eventId, vendorId, type, IncidentReportStatus.PENDING)) {
            throw new BusinessException(
                    "A report for this vendor is already awaiting coordinator review",
                    "DUPLICATE_REPORT");
        }

        int penalty = (type == IncidentType.NO_SHOW) ? 20
                : (type == IncidentType.DAMAGE ? 15 : 5);

        PostEventReport report = PostEventReport.builder()
                .event(event)
                .vendor(vendor)
                .incidentType(type)
                .notes(notes)
                .scorePenalty(penalty)
                .status(IncidentReportStatus.PENDING)
                .source("CLIENT_REPORT")
                .build();

        reportRepository.save(report);
        log.info("Incident report PENDING review: event={} vendor={} type={}",
                eventId, vendorId, type);
    }

    /**
     * Coordinator reports a no-show directly. Because the coordinator is the
     * trusted party (they observed the event), the report is auto-confirmed
     * and the strike counts immediately.
     */
    @Transactional
    public PostEventReportResponse submitCoordinatorReport(Long eventId, Long vendorId,
                                                           IncidentType type, String notes,
                                                           Long coordinatorId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));

        if (event.getStatus() != EventStatus.COMPLETED) {
            throw new BusinessException(
                    "Coordinator reports can only be filed for COMPLETED events",
                    "INVALID_STATE");
        }

        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new EntityNotFoundException("Vendor", vendorId));

        boolean assigned = assignmentRepository.findByEventId(eventId).stream()
                .anyMatch(a -> a.getVendor() != null
                        && a.getVendor().getId().equals(vendorId));
        if (!assigned) {
            throw new BusinessException(
                    "Vendor was not assigned to this event", "INVALID_STATE");
        }

        if (reportRepository.existsByEventIdAndVendorIdAndIncidentType(
                eventId, vendorId, type)) {
            throw new BusinessException(
                    "A report for this vendor and incident type already exists",
                    "DUPLICATE_REPORT");
        }

        int penalty = (type == IncidentType.NO_SHOW) ? 20
                : (type == IncidentType.DAMAGE ? 15 : 5);

        PostEventReport report = PostEventReport.builder()
                .event(event)
                .vendor(vendor)
                .incidentType(type)
                .notes(notes)
                .scorePenalty(penalty)
                .status(IncidentReportStatus.CONFIRMED)
                .source("COORDINATOR_REPORT")
                .reviewedBy(coordinatorId)
                .reviewedAt(LocalDateTime.now())
                .build();

        PostEventReport saved = reportRepository.save(report);
        log.info("Coordinator report CONFIRMED: event={} vendor={} type={} by coordinator={}",
                eventId, vendorId, type, coordinatorId);

        applyStrikeIfNoShow(saved);

        return PostEventReportResponse.from(saved);
    }

    @Transactional
    public PostEventReportResponse confirmReport(Long reportId, Long coordinatorId) {
        PostEventReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("PostEventReport", reportId));

        if (report.getStatus() != IncidentReportStatus.PENDING) {
            throw new BusinessException("Report already reviewed", "INVALID_STATE");
        }

        report.setStatus(IncidentReportStatus.CONFIRMED);
        report.setReviewedBy(coordinatorId);
        report.setReviewedAt(LocalDateTime.now());
        PostEventReport saved = reportRepository.save(report);

        applyStrikeIfNoShow(saved);

        return PostEventReportResponse.from(saved);
    }

    @Transactional
    public PostEventReportResponse rejectReport(Long reportId, Long coordinatorId, String reason) {
        PostEventReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("PostEventReport", reportId));

        if (report.getStatus() != IncidentReportStatus.PENDING) {
            throw new BusinessException("Report already reviewed", "INVALID_STATE");
        }

        report.setStatus(IncidentReportStatus.REJECTED);
        report.setReviewedBy(coordinatorId);
        report.setReviewedAt(LocalDateTime.now());
        report.setReviewNotes(reason);

        PostEventReport saved = reportRepository.save(report);
        log.info("Incident report {} REJECTED by coordinator {} ({})",
                reportId, coordinatorId, reason);
        return PostEventReportResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<PostEventReportResponse> getPendingReports() {
        return reportRepository.findByStatusOrderByCreatedAtAsc(IncidentReportStatus.PENDING)
                .stream()
                .map(PostEventReportResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countPendingReports() {
        return reportRepository.findByStatusOrderByCreatedAtAsc(IncidentReportStatus.PENDING).size();
    }

    /** Shared 3-strike logic. Called from confirm + coordinator-report paths. */
    private void applyStrikeIfNoShow(PostEventReport report) {
        if (report.getIncidentType() != IncidentType.NO_SHOW) return;

        Vendor vendor = report.getVendor();
        long confirmedNoShows = reportRepository.countByVendorIdAndIncidentTypeAndStatus(
                vendor.getId(),
                IncidentType.NO_SHOW,
                IncidentReportStatus.CONFIRMED);

        if (confirmedNoShows >= 3 && !vendor.isFlaggedForDeactivation()) {
            vendor.setFlaggedForDeactivation(true);
            vendorRepository.save(vendor);
            log.warn("🚨 VENDOR {} FLAGGED FOR DEACTIVATION ({} confirmed no-shows)",
                    vendor.getCompanyName(), confirmedNoShows);
        }
    }
}