package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.payload.ActionRequiredResponse;
import com.aicc.eventmanagement.payload.DashboardStatsResponse;
import com.aicc.eventmanagement.payload.DashboardUpcomingEvent;
import com.aicc.eventmanagement.payload.EventResponse;
import com.aicc.eventmanagement.payload.InquiryResponse;
import com.aicc.eventmanagement.payload.VendorAssignmentResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.aicc.eventmanagement.repositories.VenueBookingRepository;
import com.aicc.eventmanagement.repositories.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
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
    private final VenueBookingRepository venueBookingRepository;
    private final VenueRepository venueRepository;

    public record VenueLoad(Long id, String name, long reservedDays) {}
    public record Outlook(LocalDate from, LocalDate through, int scheduled, long confirmed,
                          List<DashboardUpcomingEvent> nextEvents, List<VenueLoad> venues) {}

    @Transactional(readOnly = true)
    public Outlook getOutlook() {
        LocalDate from = LocalDate.now(ZoneId.of("Africa/Addis_Ababa"));
        LocalDate through = from.plusDays(29);
        Map<Long, Long> reservedDays = new LinkedHashMap<>();
        for (Object[] row : venueBookingRepository.countReservedDaysByVenue(from, through)) {
            reservedDays.put((Long) row[0], ((Number) row[1]).longValue());
        }
        List<VenueLoad> venues = venueRepository.findAll().stream()
                .filter(venue -> venue.isActive() || reservedDays.containsKey(venue.getId()))
                .map(venue -> new VenueLoad(venue.getId(), venue.getName(), reservedDays.getOrDefault(venue.getId(), 0L)))
                .sorted(Comparator.comparingLong(VenueLoad::reservedDays).reversed().thenComparing(VenueLoad::name))
                .toList();
        List<DashboardUpcomingEvent> events = getUpcomingEvents(from, through);
        long confirmed = events.stream().filter(event -> event.status() == EventStatus.CONFIRMED).count();
        return new Outlook(from, through, events.size(), confirmed, events.stream().limit(5).toList(), venues);
    }

    public record LifecycleSummary(Map<String, Long> inquiries, Map<String, Long> events,
                                   long proposalsWithoutUpdateForThreeDays) {}

    @Transactional(readOnly = true)
    public LifecycleSummary getLifecycle() {
        return new LifecycleSummary(
                statusCounts(inquiryRepository.countUnconvertedByStatus()),
                statusCounts(eventRepository.countGroupedByStatus()),
                inquiryRepository.countByStatusAndUpdatedAtBeforeAndEventIsNull(
                        EventStatus.PROPOSAL_SENT, LocalDateTime.now().minusDays(3)));
    }

    private static Map<String, Long> statusCounts(List<Object[]> rows) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Object[] row : rows) {
            if (row[0] instanceof EventStatus status) counts.put(status.name(), ((Number) row[1]).longValue());
        }
        return counts;
    }

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

    public List<DashboardUpcomingEvent> getUpcomingEvents(LocalDate startDate, LocalDate endDate) {
        return eventRepository.findDashboardUpcomingEvents(startDate, endDate,
                List.of(EventStatus.CANCELLED, EventStatus.COMPLETED, EventStatus.CLOSED));
    }

    @Transactional(readOnly = true)
    public ActionRequiredResponse getActionRequired() {
        log.info("Building action required data for coordinator dashboard");

        List<Event> needsCoordinatorEvents = eventRepository.findByStatus(EventStatus.NEEDS_COORDINATOR);
        List<VendorAssignment> openAssignments = assignmentRepository.findByStatus(VendorAssignmentStatus.OPEN);
        LocalDateTime threeDaysAgo = LocalDateTime.now().minusDays(3);
        List<Inquiry> staleProposals = inquiryRepository.findStaleByStatus(
                EventStatus.PROPOSAL_SENT, threeDaysAgo);

        return ActionRequiredResponse.builder()
                .needsCoordinatorEvents(needsCoordinatorEvents.stream().map(EventResponse::from).toList())
                .openAssignments(openAssignments.stream().map(assignment -> VendorAssignmentResponse.from(assignment, true)).toList())
                .staleProposals(staleProposals.stream().map(InquiryResponse::from).toList())
                .build();
    }
}
