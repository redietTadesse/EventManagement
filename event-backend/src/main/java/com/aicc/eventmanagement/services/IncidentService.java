package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.PostEventReport;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.enums.IncidentType;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.PostEventReportRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncidentService {

    private final PostEventReportRepository reportRepository;
    private final EventRepository eventRepository;
    private final VendorRepository vendorRepository;

    @Transactional
    public void submitReport(Long eventId, Long vendorId, IncidentType type, String notes) {
        Event event = eventRepository.findById(eventId).orElseThrow(() -> new EntityNotFoundException("Event", eventId));
        Vendor vendor = vendorRepository.findById(vendorId).orElseThrow(() -> new EntityNotFoundException("Vendor", vendorId));

        int penalty = (type == IncidentType.NO_SHOW) ? 20 : (type == IncidentType.DAMAGE ? 15 : 5);

        PostEventReport report = PostEventReport.builder()
                .event(event)
                .vendor(vendor)
                .incidentType(type)
                .notes(notes)
                .scorePenalty(penalty)
                .build();
        reportRepository.save(report);

        // 3-Strike Rule
        if (type == IncidentType.NO_SHOW) {
            long noShows = reportRepository.countByVendorIdAndIncidentType(vendorId, IncidentType.NO_SHOW);
            if (noShows >= 3 && !vendor.isFlaggedForDeactivation()) {
                vendor.setFlaggedForDeactivation(true);
                vendorRepository.save(vendor);
                log.warn("🚨 VENDOR {} FLAGGED FOR DEACTIVATION (3+ NO-SHOWS)", vendor.getCompanyName());
            }
        }
    }
}