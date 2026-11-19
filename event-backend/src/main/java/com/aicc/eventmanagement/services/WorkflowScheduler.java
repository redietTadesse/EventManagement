package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.repositories.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class WorkflowScheduler {

    private final EventRepository eventRepository;
    private final EventService eventService;
    private final VendorService vendorService;

    /**
     * Expire vendor offers nobody answered, and advance each affected category.
     *
     * Hourly rather than daily: the deadline is stored per offer, so checking often
     * keeps the expiry close to the time the vendor was actually given, instead of
     * rounding every expiry to midnight.
     */
    @Scheduled(cron = "0 15 * * * *")
    public void expireStaleVendorOffers() {
        log.info("Scheduler: expiring stale vendor offers");
        int expired = vendorService.expireStaleOffers();
        if (expired > 0) {
            log.info("Scheduler: expired {} vendor offer(s)", expired);
        }
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void autoCompletePastEvents() {
        log.info("Scheduler: auto-completing past events");
        LocalDate today = LocalDate.now();
        List<Event> pastEvents = eventRepository.findPastEventsByStatus(EventStatus.CONFIRMED, today);

        for (Event event : pastEvents) {
            try {
                // Use the same transaction and assignment cascade as manual completion.
                // Each event commits separately, so one failure cannot undo the others.
                eventService.updateEventStatus(event.getId(), EventStatus.COMPLETED, Role.ADMIN);

                log.info("Auto-completed event {}", event.getId());
            } catch (Exception e) {
                log.error("Failed to auto-complete event {}: {}", event.getId(), e.getMessage());
            }
        }
    }

}
