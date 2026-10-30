package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.events.WorkflowTransitionEvent;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.payload.EventReadinessResponse;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
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
    private final ChecklistService checklistService;

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
        // Do NOT catch and swallow failures here: autoAssignForEvent joins this
        // transaction, so catching a RuntimeException and continuing would leave the
        // tx marked rollback-only and surface later as UnexpectedRollbackException.
        // Let it propagate so creation fails cleanly instead of committing half-state.
        vendorService.autoAssignForEvent(saved);
        log.info("Auto-assignment triggered for event {}", saved.getId());

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
        
        // Book or rebook venue if venueId changed.
        // Do NOT swallow BusinessException here: bookVenue joins this transaction,
        // so catching it and returning normally would leave the tx marked
        // rollback-only and surface later as UnexpectedRollbackException.
        // Let it propagate so the update fails cleanly with a 400 (VENUE_CONFLICT).
        if (request.getVenueId() != null && !request.getVenueId().equals(oldVenueId)) {
            Long inquiryId = event.getInquiry() != null ? event.getInquiry().getId() : null;
            if (inquiryId != null) {
                inquiryRepository.findById(inquiryId)
                    .ifPresent(inquiry -> {
                        venueService.bookVenue(
                            request.getVenueId(),
                            saved.getId(),
                            inquiry.getEventDate(),
                            inquiry.getEndDate()
                        );
                        log.info("Venue {} rebooked for event {} on {}",
                            request.getVenueId(), saved.getId(), inquiry.getEventDate());
                    });
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

        // Cascade assignment status changes when event completes or cancels
        if (status == EventStatus.COMPLETED) {
            vendorService.completeAssignmentsForEvent(id, userRole);
        } else if (status == EventStatus.CANCELLED) {
            vendorService.cancelAssignmentsForEvent(id, userRole);
            venueService.cancelVenueBookingsForEvent(id);
        }

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

    @Transactional(readOnly = true)
    public EventReadinessResponse getEventReadiness(Long eventId) {
        Event event = getEventById(eventId);
        boolean venueConfirmed = event.getVenueId() != null && event.getStatus() != EventStatus.CANCELLED;

        List<String> requiredCategories = vendorService.getRequiredCategoriesFor(event);
        List<VendorAssignment> assignments = vendorService.getAssignmentsByEvent(eventId);
        int confirmed = 0;
        int pending = 0;
        for (String category : requiredCategories) {
            Optional<VendorAssignment> latest = assignments.stream()
                    .filter(a -> category.equals(a.getServiceCategory()))
                    .max(Comparator.comparing(VendorAssignment::getId,
                            Comparator.nullsFirst(Comparator.naturalOrder())));
            if (latest.isEmpty()) continue;

            VendorAssignmentStatus status = latest.get().getStatus();
            if (status == VendorAssignmentStatus.ACCEPTED || status == VendorAssignmentStatus.COMPLETED) {
                confirmed++;
            } else if (status == VendorAssignmentStatus.PENDING) {
                pending++;
            }
        }

        List<Checklist> checklist = checklistService.getChecklistByEvent(eventId);
        int totalChecklistItems = checklist.size();
        int completedChecklistItems = (int) checklist.stream().filter(Checklist::isComplete).count();

        int readiness = venueConfirmed ? 30 : 0;
        if (!requiredCategories.isEmpty()) {
            readiness += (int) ((double) confirmed / requiredCategories.size() * 50);
        }
        if (totalChecklistItems > 0) {
            readiness += (int) ((double) completedChecklistItems / totalChecklistItems * 20);
        }

        return EventReadinessResponse.builder()
                .readinessPercentage(readiness)
                .venueConfirmed(venueConfirmed)
                .totalRequiredVendors(requiredCategories.size())
                .confirmedVendors(confirmed)
                .pendingVendors(pending)
                .completedChecklistItems(completedChecklistItems)
                .totalChecklistItems(totalChecklistItems)
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> analyzeDateChangeImpact(Long eventId, java.time.LocalDate newDate) {
        Event event = getEventById(eventId);
        if (newDate == null) throw new BusinessException("New event date is required", "INVALID_DATE");

        java.time.LocalDate newEndDate = shiftedEndDate(event, newDate);
        List<String> conflicts = new ArrayList<>();
        List<String> reconfirmations = new ArrayList<>();

        for (VendorAssignment assignment : vendorService.getAssignmentsByEvent(eventId)) {
            VendorAssignmentStatus status = assignment.getStatus();
            if (status != VendorAssignmentStatus.ACCEPTED && status != VendorAssignmentStatus.PENDING) continue;
            if (assignment.getVendor() == null) continue;

            boolean available = vendorService.isVendorAvailableForEvent(
                    assignment.getVendor().getId(), newDate, eventId);
            String vendorName = assignment.getVendorName() != null
                    ? assignment.getVendorName()
                    : assignment.getVendor().getCompanyName();
            if (!available) {
                conflicts.add(vendorName + " is booked on the new date.");
            } else {
                reconfirmations.add(vendorName + " is available but must reconfirm.");
            }
        }

        boolean venueAvailable = event.getVenueId() == null || venueService.isVenueAvailableForEvent(
                event.getVenueId(), newDate, newEndDate, eventId);
        if (!venueAvailable) {
            conflicts.add("The venue is already booked on the new date.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("newDate", newDate.toString());
        response.put("venueAvailable", venueAvailable);
        response.put("vendorConflicts", conflicts);
        response.put("needsReconfirmation", reconfirmations);
        return response;
    }

    @Transactional
    public Event changeEventDate(Long eventId, java.time.LocalDate newDate) {
        Event event = getEventById(eventId);
        if (event.getStatus() == EventStatus.CANCELLED || event.getStatus() == EventStatus.COMPLETED
                || event.getStatus() == EventStatus.CLOSED) {
            throw new BusinessException("A completed or cancelled event cannot be rescheduled", "INVALID_STATE");
        }
        if (newDate == null || newDate.isBefore(java.time.LocalDate.now())) {
            throw new BusinessException("New event date must be today or later", "INVALID_DATE");
        }
        Inquiry inquiry = event.getInquiry();
        if (newDate.equals(inquiry.getEventDate())) return event;

        Map<String, Object> impact = analyzeDateChangeImpact(eventId, newDate);
        List<?> vendorConflicts = (List<?>) impact.get("vendorConflicts");
        if (!vendorConflicts.isEmpty() || Boolean.FALSE.equals(impact.get("venueAvailable"))) {
            throw new BusinessException("Resolve date conflicts before changing the event date", "DATE_CONFLICT");
        }

        java.time.LocalDate shiftedEndDate = shiftedEndDate(event, newDate);
        inquiry.setEventDate(newDate);
        if (inquiry.getEndDate() != null) inquiry.setEndDate(shiftedEndDate);
        inquiryRepository.save(inquiry);

        if (event.getVenueId() != null) {
            venueService.rescheduleVenueBookingsForEvent(
                    event.getVenueId(), eventId, newDate, shiftedEndDate);
        }
        int reconfirmations = vendorService.requestVendorReconfirmationForEventDateChange(eventId);
        if (reconfirmations > 0 && event.getStatus() == EventStatus.CONFIRMED) {
            workflowEngine.validateTransition(EventStatus.CONFIRMED, EventStatus.AWAITING_VENDORS, Role.COORDINATOR);
            event.setStatus(EventStatus.AWAITING_VENDORS);
            eventPublisher.publishEvent(new WorkflowTransitionEvent(
                    this, EventStatus.CONFIRMED, EventStatus.AWAITING_VENDORS,
                    "EVENT-" + eventId, Role.COORDINATOR));
        }
        return eventRepository.save(event);
    }

    private java.time.LocalDate shiftedEndDate(Event event, java.time.LocalDate newStartDate) {
        if (event.getInquiry().getEndDate() == null) return null;
        long durationDays = java.time.temporal.ChronoUnit.DAYS.between(
                event.getInquiry().getEventDate(), event.getInquiry().getEndDate());
        return newStartDate.plusDays(Math.max(0, durationDays));
    }
}
