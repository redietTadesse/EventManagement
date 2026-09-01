package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.payload.UpdateEventRequest;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Transactional
    public Event createEvent(Event event) {
        log.info("Creating event: {}", event.getName());
        
        // Validate inquiry exists
        if (event.getInquiry() != null && event.getInquiry().getId() != null) {
            inquiryRepository.findById(event.getInquiry().getId())
                    .orElseThrow(() -> new RuntimeException("Inquiry not found with id: " + event.getInquiry().getId()));
        }
        
        return eventRepository.save(event);
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
        
        return eventRepository.save(event);
    }

    @Transactional
    public Event updateEventStatus(Long id, EventStatus status) {
        log.info("Updating event {} status to {}", id, status);
        Event event = getEventById(id);
        event.setStatus(status);
        return eventRepository.save(event);
    }

    @Transactional
    public void deleteEvent(Long id) {
        log.info("Deleting event {}", id);
        Event event = getEventById(id);
        eventRepository.delete(event);
    }

    public List<Event> getUpcomingEvents() {
        log.info("Fetching upcoming events");
        return eventRepository.findByStatusNotIn(List.of(EventStatus.COMPLETED, EventStatus.CANCELLED, EventStatus.CLOSED));
    }
}