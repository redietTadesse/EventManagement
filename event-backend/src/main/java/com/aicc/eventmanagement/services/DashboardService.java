package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.payload.DashboardStatsResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final EventRepository eventRepository;

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
}