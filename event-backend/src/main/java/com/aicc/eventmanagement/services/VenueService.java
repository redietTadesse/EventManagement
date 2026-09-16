package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.CreateVenueRequest;
import com.aicc.eventmanagement.payload.UpdateVenueRequest;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VenueService {

    private final VenueRepository venueRepository;
    private final EventRepository eventRepository;

    // Statuses where an event no longer holds its venue.
    private static final List<EventStatus> DEAD_STATUSES = List.of(
            EventStatus.CANCELLED, EventStatus.PROPOSAL_REJECTED, EventStatus.CLOSED);

    @Transactional
    public Venue create(CreateVenueRequest request) {
        log.info("Creating venue: {}", request.getName());
        if (venueRepository.existsByNameIgnoreCase(request.getName())) {
            throw new BusinessException("A venue with this name already exists: " + request.getName());
        }
        Venue venue = Venue.builder()
                .name(request.getName())
                .description(request.getDescription())
                .capacity(request.getCapacity())
                .location(request.getLocation())
                .hourlyRate(request.getHourlyRate())
                .active(true)
                .build();
        return venueRepository.save(venue);
    }

    public Venue getById(Long id) {
        return venueRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Venue not found with id: " + id));
    }

    public List<Venue> getAll() {
        return venueRepository.findAll();
    }

    @Transactional
    public Venue update(Long id, UpdateVenueRequest request) {
        log.info("Updating venue {}", id);
        Venue venue = getById(id);

        if (request.getName() != null && !request.getName().equalsIgnoreCase(venue.getName())) {
            if (venueRepository.existsByNameIgnoreCase(request.getName())) {
                throw new BusinessException("A venue with this name already exists: " + request.getName());
            }
            venue.setName(request.getName());
        }
        if (request.getDescription() != null) venue.setDescription(request.getDescription());
        if (request.getCapacity() != null) venue.setCapacity(request.getCapacity());
        if (request.getLocation() != null) venue.setLocation(request.getLocation());
        if (request.getHourlyRate() != null) venue.setHourlyRate(request.getHourlyRate());
        if (request.getActive() != null) venue.setActive(request.getActive());

        return venueRepository.save(venue);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting venue {}", id);
        Venue venue = getById(id);
        venueRepository.delete(venue);
    }

    // --- Availability (task 2) ---

    public boolean isVenueAvailable(Long venueId, LocalDate date) {
        getById(venueId); // 404 if the venue doesn't exist
        return !eventRepository.isVenueBookedOn(venueId, date, DEAD_STATUSES);
    }

    public List<Venue> getAvailableVenues(LocalDate date) {
        List<Long> bookedIds = eventRepository.findBookedVenueIdsOn(date, DEAD_STATUSES);
        return venueRepository.findAll().stream()
                .filter(Venue::isActive)                       // inactive venues aren't offerable
                .filter(v -> !bookedIds.contains(v.getId()))
                .toList();
    }
}