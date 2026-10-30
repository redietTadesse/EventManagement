package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.entities.VenueBooking;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.CreateVenueRequest;
import com.aicc.eventmanagement.payload.UpdateVenueRequest;
import com.aicc.eventmanagement.payload.VenueBookingResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.VenueBookingRepository;
import com.aicc.eventmanagement.repositories.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VenueService {

    private final VenueRepository venueRepository;
    private final EventRepository eventRepository;
    private final VenueBookingRepository venueBookingRepository;

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

    // --- Availability ---

    public boolean isVenueAvailable(Long venueId, LocalDate date) {
        getById(venueId); // 404 if the venue doesn't exist
        boolean blocked = !venueBookingRepository.findBookedVenueIdsOn(date).contains(venueId);
        if (blocked) {
            // Fallback: also check events for legacy data
            blocked = eventRepository.isVenueBookedOn(venueId, date, DEAD_STATUSES);
        }
        return !blocked;
    }

    public List<Venue> getAvailableVenues(LocalDate date) {
        List<Long> bookedIds = new ArrayList<>(venueBookingRepository.findBookedVenueIdsOn(date));
        bookedIds.addAll(eventRepository.findBookedVenueIdsOn(date, DEAD_STATUSES));
        return venueRepository.findAll().stream()
                .filter(Venue::isActive)
                .filter(v -> !bookedIds.contains(v.getId()))
                .toList();
    }

    /**
     * Books a venue for an event on a specific date range with setup/teardown buffers.
     * Uses database-level unique constraint (uq_venue_date) to prevent double-booking.
     */
    @Transactional
    public List<VenueBooking> bookVenue(Long venueId, Long eventId, LocalDate startDate, LocalDate endDate) {
        Venue venue = getById(venueId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));

        // 1. Validation: endDate cannot be before startDate
        LocalDate actualEndDate = (endDate != null) ? endDate : startDate;
        if (actualEndDate.isBefore(startDate)) {
            throw new BusinessException("End date cannot be before start date", "INVALID_DATE_RANGE");
        }

        // 2. Calculate the full blocked range including buffers
        LocalDate blockStart = startDate.minusDays(venue.getSetupBufferDays());
        LocalDate blockEnd = actualEndDate.plusDays(venue.getTeardownBufferDays());

        // 3. Check availability for the ENTIRE block using a single efficient query
        long conflicts = venueBookingRepository.countConfirmedBookingsInRange(venueId, blockStart, blockEnd);
        if (conflicts > 0) {
            throw new BusinessException(
                String.format("Venue %s is already booked on one or more days between %s and %s (including setup/teardown).",
                venue.getName(), blockStart, blockEnd),
                "VENUE_CONFLICT");
        }

        // 4. Insert a booking row for EVERY day in the block
        List<VenueBooking> bookings = new ArrayList<>();
        LocalDate insertDate = blockStart;
        while (!insertDate.isAfter(blockEnd)) {
            VenueBooking booking = VenueBooking.builder()
                .venue(venue)
                .event(event)
                .bookingDate(insertDate)
                .status(VenueBooking.BookingStatus.CONFIRMED)
                .build();
            bookings.add(booking);
            insertDate = insertDate.plusDays(1);
        }

        try {
            return venueBookingRepository.saveAll(bookings);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException("Concurrent booking detected.", "VENUE_CONFLICT");
        }
    }

    @Transactional
    public void cancelVenueBooking(Long bookingId) {
        VenueBooking booking = venueBookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("VenueBooking", bookingId));

        booking.setStatus(VenueBooking.BookingStatus.CANCELLED);
        venueBookingRepository.save(booking);
        log.info("Cancelled venue booking {}", bookingId);
    }

    @Transactional
    public void cancelVenueBookingsForEvent(Long eventId) {
        List<VenueBooking> bookings = venueBookingRepository.findByEventId(eventId);
        for (VenueBooking booking : bookings) {
            booking.setStatus(VenueBooking.BookingStatus.CANCELLED);
        }
        venueBookingRepository.saveAll(bookings);
        log.info("Cancelled {} venue bookings for event {}", bookings.size(), eventId);
    }

    public List<VenueBookingResponse> getVenueBookings(Long venueId) {
        getById(venueId); // 404 if the venue doesn't exist
        List<VenueBooking> bookings = venueBookingRepository.findByVenueId(venueId);
        return bookings.stream()
                .map(VenueBookingResponse::from)
                .toList();
    }
}