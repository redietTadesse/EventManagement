package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.events.WorkflowTransitionEvent;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class WorkflowScheduler {

    private final EventRepository eventRepository;
    private final InquiryRepository inquiryRepository;
    private final WorkflowEngine workflowEngine;
    private final ApplicationEventPublisher eventPublisher;

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void autoCompletePastEvents() {
        log.info("Scheduler: auto-completing past events");
        LocalDate today = LocalDate.now();
        List<Event> pastEvents = eventRepository.findPastEventsByStatus(EventStatus.CONFIRMED, today);

        for (Event event : pastEvents) {
            try {
                workflowEngine.validateTransition(event.getStatus(), EventStatus.COMPLETED, Role.ADMIN);
                EventStatus old = event.getStatus();
                event.setStatus(EventStatus.COMPLETED);
                eventRepository.save(event);

                eventPublisher.publishEvent(new WorkflowTransitionEvent(
                        this, old, EventStatus.COMPLETED,
                        "EVENT-" + event.getId(), Role.ADMIN));

                log.info("Auto-completed event {}", event.getId());
            } catch (Exception e) {
                log.error("Failed to auto-complete event {}: {}", event.getId(), e.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void autoCloseStaleRejectedProposals() {
        log.info("Scheduler: auto-closing stale rejected proposals");
        LocalDateTime cutoff = LocalDateTime.now().minusDays(14);
        List<Inquiry> stale = inquiryRepository.findStaleByStatus(EventStatus.PROPOSAL_REJECTED, cutoff);

        for (Inquiry inquiry : stale) {
            try {
                workflowEngine.validateTransition(inquiry.getStatus(), EventStatus.CLOSED, Role.ADMIN);
                EventStatus old = inquiry.getStatus();
                inquiry.setStatus(EventStatus.CLOSED);
                inquiryRepository.save(inquiry);

                eventPublisher.publishEvent(new WorkflowTransitionEvent(
                        this, old, EventStatus.CLOSED,
                        String.valueOf(inquiry.getId()), Role.ADMIN));

                log.info("Auto-closed inquiry {}", inquiry.getId());
            } catch (Exception e) {
                log.error("Failed to auto-close inquiry {}: {}", inquiry.getId(), e.getMessage());
            }
        }
    }
}