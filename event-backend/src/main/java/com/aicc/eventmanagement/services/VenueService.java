package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.entities.VenueBooking;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.CreateVenueRequest;
import com.aicc.eventmanagement.payload.UpdateVenueRequest;
import com.aicc.eventmanagement.payload.VenueAvailabilityGridResponse;
import com.aicc.eventmanagement.payload.VenueBookingResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.VenueBookingRepository;
import com.aicc.eventmanagement.repositories.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class VenueService {

    private final VenueRepository venueRepository;
    private final EventRepository eventRepository;
    private final VenueBookingRepository venueBookingRepository;

    /**
     * How long a coordinator hold survives before it stops blocking the date.
     * A default is supplied so a missing property cannot break startup.
     */
    @Value("${app.venue.hold-expiry-hours:72}")
    private long holdExpiryHours;

    private static final int MAX_HOLD_DAYS = 30;

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

        // Confirmed bookings and live holds both make a venue unavailable.
        boolean blocked = venueBookingRepository
                .findUnavailableVenueIdsOn(date, LocalDateTime.now())
                .contains(venueId);

        if (!blocked) {
            // Fallback: also check events for legacy data
            blocked = eventRepository.isVenueBookedOn(venueId, date, DEAD_STATUSES);
        }
        return !blocked;
    }

    public List<Venue> getAvailableVenues(LocalDate date) {
        List<Long> bookedIds = new ArrayList<>(
                venueBookingRepository.findUnavailableVenueIdsOn(date, LocalDateTime.now()));
        bookedIds.addAll(eventRepository.findBookedVenueIdsOn(date, DEAD_STATUSES));
        return venueRepository.findAll().stream()
                .filter(Venue::isActive)
                .filter(v -> !bookedIds.contains(v.getId()))
                .toList();
    }

    /**
     * The coordinator grid: every active venue against the next N days.
     *
     * Built from two bulk queries rather than one per cell. With 20 venues over 30
     * days that is the difference between 2 queries and 600.
     */
    @Transactional(readOnly = true)
    public VenueAvailabilityGridResponse getAvailabilityGrid(int daysAhead) {
        if (daysAhead < 1 || daysAhead > 90) {
            throw new BusinessException("daysAhead must be between 1 and 90");
        }

        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(daysAhead - 1L);
        LocalDateTime now = LocalDateTime.now();

        List<Venue> venues = venueRepository.findAll().stream()
                .filter(Venue::isActive)
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .toList();

        // Key is venueId + date, because the unique constraint guarantees one row per pair.
        Map<String, VenueBooking> bookingIndex = new HashMap<>();
        for (VenueBooking vb : venueBookingRepository.findBlockingRowsInRange(startDate, endDate, now)) {
            bookingIndex.put(cellKey(vb.getVenue().getId(), vb.getBookingDate()), vb);
        }

        // Legacy path: events that carry a venueId without a venue_bookings row.
        Map<String, Event> legacyIndex = new HashMap<>();
        for (Event e : eventRepository.findVenueBookedEventsInRange(startDate, endDate, DEAD_STATUSES)) {
            legacyIndex.put(cellKey(e.getVenueId(), e.getInquiry().getEventDate()), e);
        }

        List<VenueAvailabilityGridResponse.VenueRow> rows = new ArrayList<>();
        for (Venue venue : venues) {
            List<VenueAvailabilityGridResponse.DayCell> days = new ArrayList<>();
            for (int i = 0; i < daysAhead; i++) {
                LocalDate date = startDate.plusDays(i);
                days.add(buildCell(venue.getId(), date, bookingIndex, legacyIndex, now));
            }
            rows.add(VenueAvailabilityGridResponse.VenueRow.builder()
                    .venueId(venue.getId())
                    .name(venue.getName())
                    .location(venue.getLocation())
                    .capacity(venue.getCapacity())
                    .days(days)
                    .build());
        }

        return VenueAvailabilityGridResponse.builder()
                .startDate(startDate)
                .endDate(endDate)
                .venues(rows)
                .build();
    }

    private VenueAvailabilityGridResponse.DayCell buildCell(
            Long venueId,
            LocalDate date,
            Map<String, VenueBooking> bookingIndex,
            Map<String, Event> legacyIndex,
            LocalDateTime now) {

        String key = cellKey(venueId, date);

        VenueBooking vb = bookingIndex.get(key);
        if (vb != null) {
            if (vb.isActiveHold(now)) {
                return VenueAvailabilityGridResponse.DayCell.builder()
                        .date(date)
                        .status("HELD")
                        .bookingId(vb.getId())
                        .heldBy(vb.getHeldBy())
                        .expiresAt(vb.getExpiresAt())
                        .build();
            }
            if (vb.getStatus() == VenueBooking.BookingStatus.CONFIRMED) {
                Event event = vb.getEvent();
                return VenueAvailabilityGridResponse.DayCell.builder()
                        .date(date)
                        .status("BOOKED")
                        .bookingId(vb.getId())
                        .eventName(event != null ? event.getName() : "Booked")
                        .eventId(event != null ? event.getId() : null)
                        .build();
            }
        }

        Event legacy = legacyIndex.get(key);
        if (legacy != null) {
            return VenueAvailabilityGridResponse.DayCell.builder()
                    .date(date)
                    .status("BOOKED")
                    .eventName(legacy.getName())
                    .eventId(legacy.getId())
                    .build();
        }

        return VenueAvailabilityGridResponse.DayCell.builder()
                .date(date)
                .status("FREE")
                .build();
    }

    private String cellKey(Long venueId, LocalDate date) {
        return venueId + "|" + date;
    }

    // --- Holds ---

    /**
     * Places a hold across consecutive dates starting at startDate.
     *
     * All or nothing: if any date in the span is unavailable the whole call fails and
     * nothing is written, so a coordinator never ends up with a partial hold they
     * didn't ask for.
     */
    @Transactional
    public List<VenueBooking> holdVenue(Long venueId, LocalDate startDate, int days, String heldBy) {
        if (days < 1 || days > MAX_HOLD_DAYS) {
            throw new BusinessException("A hold must cover between 1 and " + MAX_HOLD_DAYS + " days");
        }

        LocalDate today = LocalDate.now();
        if (startDate.isBefore(today)) {
            throw new BusinessException("Cannot hold a date in the past: " + startDate);
        }

        Venue venue = getById(venueId);
        if (!venue.isActive()) {
            throw new BusinessException("Venue is not active: " + venue.getName());
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusHours(holdExpiryHours);
        List<VenueBooking> result = new ArrayList<>();

        for (int i = 0; i < days; i++) {
            LocalDate date = startDate.plusDays(i);

            if (eventRepository.isVenueBookedOn(venueId, date, DEAD_STATUSES)) {
                throw new BusinessException(
                        String.format("Venue %s already has an event on %s", venue.getName(), date),
                        "VENUE_CONFLICT");
            }

            VenueBooking existing = venueBookingRepository.findByVenueAndDate(venueId, date).orElse(null);

            if (existing != null) {
                if (existing.getStatus() == VenueBooking.BookingStatus.CONFIRMED) {
                    throw new BusinessException(
                            String.format("Venue %s is already booked on %s", venue.getName(), date),
                            "VENUE_CONFLICT");
                }
                if (existing.isActiveHold(now)) {
                    throw new BusinessException(
                            String.format("Venue %s is already held on %s by %s until %s",
                                    venue.getName(), date, existing.getHeldBy(), existing.getExpiresAt()),
                            "VENUE_HELD");
                }
                // Cancelled or expired: recycle the row rather than insert and trip uq_venue_date.
                existing.setStatus(VenueBooking.BookingStatus.HELD);
                existing.setEvent(null);
                existing.setExpiresAt(expiresAt);
                existing.setHeldBy(heldBy);
                result.add(venueBookingRepository.save(existing));
                continue;
            }

            try {
                VenueBooking hold = VenueBooking.builder()
                        .venue(venue)
                        .event(null)
                        .bookingDate(date)
                        .status(VenueBooking.BookingStatus.HELD)
                        .expiresAt(expiresAt)
                        .heldBy(heldBy)
                        .build();
                // saveAndFlush so a concurrent insert surfaces here, not at commit.
                result.add(venueBookingRepository.saveAndFlush(hold));
            } catch (DataIntegrityViolationException e) {
                log.warn("Hold conflict: venue {} on {}", venueId, date);
                throw new BusinessException(
                        String.format("Venue %s was just taken on %s", venue.getName(), date),
                        "VENUE_CONFLICT");
            }
        }

        log.info("{} held venue {} for {} day(s) from {}", heldBy, venueId, days, startDate);
        return result;
    }

    /** Releases one held date. Confirmed bookings are not touched by this path. */
    @Transactional
    public void releaseHold(Long bookingId) {
        VenueBooking booking = venueBookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("VenueBooking", bookingId));

        if (booking.getStatus() != VenueBooking.BookingStatus.HELD) {
            throw new BusinessException(
                    "Booking " + bookingId + " is not a hold, it is " + booking.getStatus(),
                    "NOT_A_HOLD");
        }

        Long venueId = booking.getVenue().getId();
        LocalDate date = booking.getBookingDate();
        venueBookingRepository.delete(booking);
        log.info("Released hold {} on venue {} for {}", bookingId, venueId, date);
    }

    /**
     * Books a venue for an event on a specific date.
     *
     * A live hold on that date is converted in place rather than rejected: holding
     * then booking is the intended coordinator flow, and converting keeps the one
     * row per venue and date that uq_venue_date requires.
     */
    @Transactional
    public VenueBooking bookVenue(Long venueId, Long eventId, LocalDate date) {
        Venue venue = getById(venueId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));

        VenueBooking existing = venueBookingRepository.findByVenueAndDate(venueId, date).orElse(null);

        if (existing != null) {
            if (existing.getStatus() == VenueBooking.BookingStatus.CONFIRMED) {
                throw new BusinessException(
                        String.format("Venue %s is already booked on %s", venue.getName(), date),
                        "VENUE_CONFLICT");
            }
            // A held or dead row becomes this event's confirmed booking.
            existing.setEvent(event);
            existing.setStatus(VenueBooking.BookingStatus.CONFIRMED);
            existing.setExpiresAt(null);
            existing.setHeldBy(null);
            log.info("Converted booking row {} to CONFIRMED for event {}", existing.getId(), eventId);
            return venueBookingRepository.save(existing);
        }

        try {
            VenueBooking booking = VenueBooking.builder()
                    .venue(venue)
                    .event(event)
                    .bookingDate(date)
                    .status(VenueBooking.BookingStatus.CONFIRMED)
                    .build();

            return venueBookingRepository.saveAndFlush(booking);
        } catch (DataIntegrityViolationException e) {
            log.warn("Venue conflict: venue {} already booked on {}", venueId, date);
            throw new BusinessException(
                    String.format("Venue %s is already booked on %s", venue.getName(), date),
                    "VENUE_CONFLICT");
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

    @Transactional(readOnly = true)
    public List<VenueBookingResponse> getVenueBookings(Long venueId) {
        getById(venueId); // 404 if the venue doesn't exist
        List<VenueBooking> bookings = venueBookingRepository.findByVenueId(venueId);
        return bookings.stream()
                .map(VenueBookingResponse::from)
                .toList();
    }
}