package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.events.WorkflowTransitionEvent;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.payload.UpdateEventRequest;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.services.VenueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepository;
    private final InquiryRepository inquiryRepository;
    private final VendorService vendorService;
    private final WorkflowEngine workflowEngine;
    private final ApplicationEventPublisher eventPublisher;
    private final VenueService venueService;

    @Transactional
    public Event createEvent(Event event) {
        log.info("Creating event: {}", event.getName());

        // Validate inquiry exists
        if (event.getInquiry() != null && event.getInquiry().getId() != null) {
            inquiryRepository.findById(event.getInquiry().getId())
                    .orElseThrow(() -> new RuntimeException("Inquiry not found with id: " + event.getInquiry().getId()));
        }

        // Set initial status if not set
        if (event.getStatus() == null) {
            event.setStatus(EventStatus.EVENT_CREATED);
        }

        Event saved = eventRepository.save(event);

        // AUTO-ASSIGN VENDORS AFTER EVENT CREATION
        try {
            vendorService.autoAssignForEvent(saved);
            log.info("Auto-assignment triggered for event {}", saved.getId());
        } catch (Exception e) {
            log.error("Auto-assignment failed for event {}: {}", saved.getId(), e.getMessage());
            // Event still created, vendors need manual assignment
            // Status remains EVENT_CREATED or becomes NEEDS_COORDINATOR
        }

        return saved;
    }

    public Event getEventById(Long id) {
        log.info("Fetching event with id: {}", id);
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + id));
    }

    public List<Event> getAllEvents() {
        log.info("Fetching all events");
        return eventRepository.findAll();
    }

    public List<Event> getEventsByStatus(EventStatus status) {
        log.info("Fetching events with status: {}", status);
        return eventRepository.findByStatus(status);
    }

    public Event getEventByInquiryId(Long inquiryId) {
        log.info("Fetching event for inquiry: {}", inquiryId);
        return eventRepository.findByInquiryId(inquiryId)
                .orElseThrow(() -> new RuntimeException("Event not found for inquiry: " + inquiryId));
    }

    @Transactional
    public Event updateEvent(Long id, UpdateEventRequest request) {
        log.info("Updating event {}", id);
        Event event = getEventById(id);
        
        Long oldVenueId = event.getVenueId();
        if (request.getName() != null) {
            event.setName(request.getName());
        }
        if (request.getVenue() != null) {
            event.setVenue(request.getVenue());
        }
        if (request.getVenueId() != null) {
            event.setVenueId(request.getVenueId());
        }
        if (request.getVenueDetails() != null) {
            event.setVenueDetails(request.getVenueDetails());
        }
        if (request.getUnfilledCategories() != null) {
            event.setUnfilledCategories(request.getUnfilledCategories());
        }
        
        Event saved = eventRepository.save(event);
        
        // Book or rebook venue if venueId changed
        if (request.getVenueId() != null && !request.getVenueId().equals(oldVenueId)) {
            try {
                // Get the inquiry to find the event date
                inquiryRepository.findById(event.getInquiry().getId())
                    .ifPresent(inquiry -> {
                        try {
                            venueService.bookVenue(
                                request.getVenueId(),
                                saved.getId(),
                                inquiry.getEventDate()
                            );
                            log.info("Venue {} rebooked for event {} on {}",
                                request.getVenueId(), saved.getId(), inquiry.getEventDate());
                        } catch (BusinessException e) {
                            log.warn("Venue rebooking failed for event {}: {}", saved.getId(), e.getMessage());
                        }
                    });
            } catch (Exception e) {
                log.warn("Failed to process venue booking for event {}: {}", saved.getId(), e.getMessage());
            }
        }
        
        return saved;
    }

    @Transactional
    public Event updateEventStatus(Long id, EventStatus status, Role userRole) {
        log.info("Updating event {} status to {} by {}", id, status, userRole);
        Event event = getEventById(id);

        EventStatus oldStatus = event.getStatus();
        if (oldStatus == status) {
            return event;
        }

        workflowEngine.validateTransition(oldStatus, status, userRole);

        event.setStatus(status);
        Event saved = eventRepository.save(event);

        eventPublisher.publishEvent(new WorkflowTransitionEvent(
                this, oldStatus, status, "EVENT-" + id, userRole));

        return saved;
    }

    @Transactional
    public void deleteEvent(Long id) {
        log.info("Deleting event {}", id);
        Event event = getEventById(id);
        eventRepository.delete(event);
    }

    public List<Event> getUpcomingEvents() {
        log.info("Fetching upcoming events");
        return eventRepository.findAllActiveEvents(List.of(EventStatus.COMPLETED, EventStatus.CANCELLED, EventStatus.CLOSED));
    }
}
