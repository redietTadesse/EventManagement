package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.events.EventCreatedEvent;
import com.aicc.eventmanagement.events.InquiryCreatedEvent;
import com.aicc.eventmanagement.events.InquiryStatusChangedEvent;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.ConvertToEventRequest;
import com.aicc.eventmanagement.payload.CreateInquiryRequest;
import com.aicc.eventmanagement.payload.UpdateInquiryRequest;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final EventRepository eventRepository;
    private final ApplicationEventPublisher eventPublisher;

    private static final Map<String, List<String>> CHECKLIST_TEMPLATES = Map.of(
            "conference", List.of("Book main hall", "Arrange AV equipment", "Arrange catering service", "Arrange security", "Set up registration desk"),
            "wedding", List.of("Book ceremony venue", "Arrange catering service", "Arrange photography", "Book music / DJ", "Order flowers"),
            "trade_show", List.of("Book exhibition space", "Arrange booth setup", "Arrange security", "Arrange cleaning services", "Confirm exhibitor list"),
            "exhibition", List.of("Book exhibition space", "Arrange booth setup", "Arrange security", "Arrange cleaning services", "Confirm exhibitor list"),
            "concert", List.of("Book venue", "Arrange stage setup", "Arrange AV equipment", "Arrange security", "Confirm artist line-up"),
            "gala", List.of("Book ballroom", "Arrange catering service", "Arrange photography", "Book music / DJ", "Arrange security"),
            "seminar", List.of("Book meeting room", "Arrange AV equipment", "Arrange catering")
    );

    public Inquiry createInquiry(CreateInquiryRequest request) {
        if (request.getEventDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Event date cannot be in the past");
        }

        Inquiry inquiry = Inquiry.builder()
                .clientId(request.getClientId())
                .clientName(request.getClientName())
                .eventType(request.getEventType())
                .eventDate(request.getEventDate())
                .expectedAttendees(request.getExpectedAttendees())
                .requirements(request.getRequirements())
                .status(EventStatus.INQUIRY_SUBMITTED)
                .build();

        Inquiry saved = inquiryRepository.save(inquiry);
        log.info("Created inquiry with id: {} for client: {}", saved.getId(), saved.getClientName());

        eventPublisher.publishEvent(new InquiryCreatedEvent(this, saved));
        return saved;
    }

    public Inquiry getInquiryById(Long id) {
        return inquiryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
    }

    public List<Inquiry> getAllInquiries() {
        return inquiryRepository.findAll();
    }

    public List<Inquiry> getInquiriesByStatus(EventStatus status) {
        return inquiryRepository.findByStatus(status);
    }

    public List<Inquiry> getInquiriesByClient(Long clientId) {
        return inquiryRepository.findByClientId(clientId);
    }

    public List<Inquiry> getInquiriesByClientAndStatus(Long clientId, EventStatus status) {
        return inquiryRepository.findByClientIdAndStatus(clientId, status);
    }

    public List<Inquiry> searchByEventType(String eventType) {
        return inquiryRepository.findByEventTypeContaining(eventType);
    }

    public List<Inquiry> searchByClientName(String clientName) {
        return inquiryRepository.findByClientNameContaining(clientName);
    }

    public List<Inquiry> searchByDateRange(LocalDate startDate, LocalDate endDate) {
        return inquiryRepository.findByEventDateBetween(startDate, endDate);
    }

    public List<Inquiry> searchByAttendeesRange(Integer minAttendees, Integer maxAttendees) {
        if (minAttendees != null && maxAttendees != null) {
            return inquiryRepository.findByExpectedAttendeesGreaterThanEqual(minAttendees).stream()
                    .filter(inquiry -> inquiry.getExpectedAttendees() <= maxAttendees)
                    .toList();
        } else if (minAttendees != null) {
            return inquiryRepository.findByExpectedAttendeesGreaterThanEqual(minAttendees);
        } else if (maxAttendees != null) {
            return inquiryRepository.findByExpectedAttendeesLessThanEqual(maxAttendees);
        }
        return getAllInquiries();
    }

    public List<Inquiry> advancedSearch(
            EventStatus status,
            Long clientId,
            String eventType,
            String clientName,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return inquiryRepository.findByFilters(status, clientId, eventType, clientName, startDate, endDate);
    }

    @Transactional
    public Inquiry updateInquiry(Long id, UpdateInquiryRequest request) {
        log.info("Updating inquiry {}", id);
        Inquiry inquiry = getInquiryById(id);
        
        if (request.getClientName() != null) {
            inquiry.setClientName(request.getClientName());
        }
        if (request.getEventType() != null) {
            inquiry.setEventType(request.getEventType());
        }
        if (request.getEventDate() != null) {
            if (request.getEventDate().isBefore(LocalDate.now())) {
                throw new RuntimeException("Event date cannot be in the past");
            }
            inquiry.setEventDate(request.getEventDate());
        }
        if (request.getExpectedAttendees() != null) {
            inquiry.setExpectedAttendees(request.getExpectedAttendees());
        }
        if (request.getRequirements() != null) {
            inquiry.setRequirements(request.getRequirements());
        }
        
        return inquiryRepository.save(inquiry);
    }

    @Transactional
    public void deleteInquiry(Long id) {
        log.info("Deleting inquiry {}", id);
        Inquiry inquiry = getInquiryById(id);
        
        // Prevent deletion if inquiry has an associated event
        if (inquiry.getEvent() != null) {
            throw new RuntimeException("Cannot delete inquiry with associated event. Delete the event first.");
        }
        
        inquiryRepository.delete(inquiry);
    }

    @Transactional
    public Inquiry updateInquiryStatus(Long id, EventStatus newStatus) {
        Inquiry inquiry = getInquiryById(id);
        EventStatus oldStatus = inquiry.getStatus();

        if (!isValidTransition(oldStatus, newStatus)) {
            throw new RuntimeException(String.format("Invalid status transition from %s to %s", oldStatus, newStatus));
        }

        inquiry.setStatus(newStatus);
        Inquiry saved = inquiryRepository.save(inquiry);
        eventPublisher.publishEvent(new InquiryStatusChangedEvent(this, saved, oldStatus, newStatus));

        log.info("Updated inquiry {} status from {} to {}", id, oldStatus, newStatus);
        return saved;
    }

    @Transactional
    public Event convertToEvent(Long inquiryId, ConvertToEventRequest request) {
        Inquiry inquiry = getInquiryById(inquiryId);

        if (inquiry.getStatus() != EventStatus.PROPOSAL_ACCEPTED) {
            throw new RuntimeException(String.format("Only accepted proposals can be converted to events. Current status: %s", inquiry.getStatus()));
        }

        if (inquiry.getEvent() != null) {
            throw new RuntimeException("This inquiry already has an event associated.");
        }

        Event event = Event.builder()
                .inquiry(inquiry)
                .name(request.getName() != null ? request.getName() : inquiry.getEventType() + " - " + inquiry.getClientName())
                .status(EventStatus.EVENT_CREATED)
                .venue(request.getVenue())
                .venueId(request.getVenueId())
                .venueDetails(request.getVenueDetails())
                .build();

        List<Checklist> checklistItems = generateChecklistForEventType(inquiry.getEventType());
        checklistItems.forEach(event::addChecklistItem);

        Event savedEvent = eventRepository.save(event);

        inquiry.setStatus(EventStatus.EVENT_CREATED);
        inquiry.setEvent(savedEvent);
        inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new EventCreatedEvent(this, savedEvent));

        log.info("Converted inquiry {} to event {} ({} checklist items)", inquiryId, savedEvent.getId(), checklistItems.size());
        return savedEvent;
    }

    private boolean isValidTransition(EventStatus from, EventStatus to) {
        if (from.isTerminal()) return false;
        if (from == EventStatus.PROPOSAL_ACCEPTED && to != EventStatus.EVENT_CREATED) return false;
        if (from == EventStatus.EVENT_CREATED && to.ordinal() < EventStatus.EVENT_CREATED.ordinal()) return false;
        return true;
    }

    private List<Checklist> generateChecklistForEventType(String eventType) {
        List<String> items = CHECKLIST_TEMPLATES.getOrDefault(eventType, List.of("Book venue", "Arrange services"));
        List<Checklist> checklist = new ArrayList<>();
        for (String itemName : items) {
            Checklist item = Checklist.builder()
                    .itemName(itemName)
                    .isComplete(false)
                    .dueDate(LocalDate.now().plusDays(7))
                    .build();
            checklist.add(item);
        }
        return checklist;
    }
}