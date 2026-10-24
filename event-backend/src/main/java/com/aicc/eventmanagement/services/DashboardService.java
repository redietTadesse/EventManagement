package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.payload.ActionRequiredResponse;
import com.aicc.eventmanagement.payload.DashboardStatsResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final EventRepository eventRepository;
    private final InquiryRepository inquiryRepository;
    private final VendorAssignmentRepository assignmentRepository;

    public DashboardStatsResponse getStats() {
        log.info("Building dashboard stats");

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByIsActive(true);
        long activeVendors = vendorRepository.findByIsActive(true).size();
        long totalEvents = eventRepository.count();

        // Every status represented, even those with zero events, in enum order.
        Map<String, Long> eventsByStatus = new LinkedHashMap<>();
        for (EventStatus status : EventStatus.values()) {
            eventsByStatus.put(status.name(), (long) eventRepository.findByStatus(status).size());
        }

        return new DashboardStatsResponse(
                totalUsers, activeUsers, activeVendors, totalEvents, eventsByStatus);
    }

    public DashboardStatsResponse getCoordinatorStats() {
        log.info("Building dashboard stats (coordinator)");

        long activeVendors = vendorRepository.findByIsActive(true).size();
        long totalEvents = eventRepository.count();

        // Every status represented, even those with zero events, in enum order.
        Map<String, Long> eventsByStatus = new LinkedHashMap<>();
        for (EventStatus status : EventStatus.values()) {
            eventsByStatus.put(status.name(), (long) eventRepository.findByStatus(status).size());
        }

        return new DashboardStatsResponse(
                0L, 0L, activeVendors, totalEvents, eventsByStatus);
    }

    public ActionRequiredResponse getActionRequired() {
        log.info("Building action required data for coordinator dashboard");

        List<Event> needsCoordinatorEvents = eventRepository.findByStatus(EventStatus.NEEDS_COORDINATOR);
        List<VendorAssignment> openAssignments = assignmentRepository.findByStatus(VendorAssignmentStatus.OPEN);
        LocalDateTime threeDaysAgo = LocalDateTime.now().minusDays(3);
        List<Inquiry> staleProposals = inquiryRepository.findStaleByStatus(
                EventStatus.PROPOSAL_SENT, threeDaysAgo);

        return ActionRequiredResponse.builder()
                .needsCoordinatorEvents(needsCoordinatorEvents)
                .openAssignments(openAssignments)
                .staleProposals(staleProposals)
                .build();
    }
}