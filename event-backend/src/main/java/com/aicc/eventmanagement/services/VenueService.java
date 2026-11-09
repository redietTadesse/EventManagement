package com.aicc.eventmanagement.services;
import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.entities.VenueBooking;
import com.aicc.eventmanagement.entities.VenueUnavailableDate;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.CreateVenueRequest;
import com.aicc.eventmanagement.payload.UpdateVenueRequest;
import com.aicc.eventmanagement.payload.VenueAvailabilityGridResponse;

import com.aicc.eventmanagement.payload.VenueBookingResponse;
import com.aicc.eventmanagement.payload.VenueFitResponse;
import com.aicc.eventmanagement.payload.VenueUnavailableDateRequest;

import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.VenueBookingRepository;
import com.aicc.eventmanagement.repositories.VenueRepository;
import com.aicc.eventmanagement.repositories.VenueUnavailableDateRepository;
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
    private final VenueUnavailableDateRepository unavailableDateRepository;

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
        String name = request.getName().trim();
        log.info("Creating venue: {}", name);
        if (venueRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessException("A venue with this name already exists: " + name);
        }
        Venue venue = Venue.builder()
                .name(name)
                .description(request.getDescription())
                .resources(request.getResources())
                .capacity(request.getCapacity())
                .location(request.getLocation())
                .hourlyRate(request.getHourlyRate())
                .setupBufferDays(request.getSetupBufferDays() != null ? request.getSetupBufferDays() : 1)
                .teardownBufferDays(request.getTeardownBufferDays() != null ? request.getTeardownBufferDays() : 1)
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
        Venue venue = getByIdForUpdate(id);

        if (request.getName() != null && request.getName().isBlank()) {
            throw new BusinessException("Venue name cannot be blank", "INVALID_VENUE_NAME");
        }
        if (request.getName() != null && !request.getName().trim().equalsIgnoreCase(venue.getName())) {
            String name = request.getName().trim();
            if (venueRepository.existsByNameIgnoreCase(name)) {
                throw new BusinessException("A venue with this name already exists: " + name);
            }
            venue.setName(name);
        }
        if (request.getCapacity() != null
                && (venue.getCapacity() == null || request.getCapacity() < venue.getCapacity())) {
            if (venueBookingRepository.existsFutureBookingExceedingCapacity(id, LocalDate.now(), request.getCapacity())) {
                throw new BusinessException(
                        "Capacity cannot be reduced below attendance for an upcoming confirmed booking",
                        "VENUE_CAPACITY_CONFLICT");
            }
        }
        boolean buffersChanged = (request.getSetupBufferDays() != null
                && request.getSetupBufferDays() != venue.getSetupBufferDays())
                || (request.getTeardownBufferDays() != null
                && request.getTeardownBufferDays() != venue.getTeardownBufferDays());
        if (buffersChanged && venueBookingRepository.existsByVenueIdAndBookingDateGreaterThanEqualAndStatus(
                id, LocalDate.now(), VenueBooking.BookingStatus.CONFIRMED)) {
            throw new BusinessException(
                    "Setup and teardown buffers cannot change while future confirmed bookings exist",
                    "VENUE_BUFFER_CONFLICT");
        }

        if (request.getDescription() != null) venue.setDescription(request.getDescription());
        if (request.getResources() != null) venue.setResources(request.getResources());
        if (request.getCapacity() != null) venue.setCapacity(request.getCapacity());
        if (request.getLocation() != null) venue.setLocation(request.getLocation());
        if (request.getHourlyRate() != null) venue.setHourlyRate(request.getHourlyRate());
        if (request.getSetupBufferDays() != null) venue.setSetupBufferDays(request.getSetupBufferDays());
        if (request.getTeardownBufferDays() != null) venue.setTeardownBufferDays(request.getTeardownBufferDays());
        if (request.getActive() != null) venue.setActive(request.getActive());

        return venueRepository.save(venue);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting venue {}", id);
        Venue venue = getByIdForUpdate(id);
        if (venueBookingRepository.existsByVenueId(id)
                || unavailableDateRepository.existsByVenueId(id)
                || eventRepository.existsByVenueId(id)) {
            throw new BusinessException(
                    "This venue has event or availability history. Deactivate it to keep those records intact.",
                    "VENUE_HAS_HISTORY");
        }
        venueRepository.delete(venue);
    }

    // --- Availability ---

    public boolean isVenueAvailable(Long venueId, LocalDate date) {

        return isVenueAvailable(venueId, date, null);
    }

    public boolean isVenueAvailable(Long venueId, LocalDate date, Integer expectedAttendees) {
        return isVenueAvailable(venueId, date, date, expectedAttendees);
    }

    public boolean isVenueAvailable(Long venueId, LocalDate startDate, LocalDate endDate, Integer expectedAttendees) {
        Venue venue = getById(venueId);
        return isVenueAvailableForRange(venue, startDate, endDate, -1L, expectedAttendees, null);
    }

    public boolean isVenueAvailableForEvent(Long venueId, LocalDate startDate, LocalDate endDate, Long eventId) {
        Integer expectedAttendees = eventId == null ? null : eventRepository.findById(eventId)
                .map(event -> event.getInquiry() != null ? event.getInquiry().getExpectedAttendees() : null)
                .orElse(null);
        return isVenueAvailableForEvent(venueId, startDate, endDate, eventId, expectedAttendees);
    }

    public boolean isVenueAvailableForEvent(
            Long venueId, LocalDate startDate, LocalDate endDate, Long eventId, Integer expectedAttendees) {
        Venue venue = getById(venueId);
        String type = eventId == null ? null : eventRepository.findById(eventId)
                .map(Event::getInquiry).map(com.aicc.eventmanagement.entities.Inquiry::getEventType).orElse(null);
        return isVenueAvailableForRange(venue, startDate, endDate, eventId, expectedAttendees, type);
    }

    private boolean isVenueAvailableForRange(
            Venue venue, LocalDate startDate, LocalDate endDate, Long eventId, Integer expectedAttendees, String eventType) {
        if (startDate == null || (endDate != null && endDate.isBefore(startDate))) return false;
        if (!venue.isActive() || exceedsCapacity(venue, expectedAttendees)) return false;
        Long excludedEventId = eventId != null ? eventId : -1L;
        var window = bookingWindow(venue, eventType, startDate, endDate);
        LocalDate blockStart = window.from();
        LocalDate blockEnd = window.through();

        if (unavailableDateRepository.existsByVenueIdAndUnavailableDateBetween(
                venue.getId(), blockStart, blockEnd)) {
            return false;
        }

        long confirmedBookings = venueBookingRepository.countConfirmedBookingsInRangeExcludingEvent(
                venue.getId(), blockStart, blockEnd, excludedEventId);
        if (confirmedBookings > 0) return false;

        return eventRepository.countVenueEventsInRangeExcludingEvent(
                venue.getId(), blockStart, blockEnd, DEAD_STATUSES, excludedEventId) == 0;
    }

    @Transactional
    public List<VenueBooking> rescheduleVenueBookingsForEvent(
            Long venueId, Long eventId, LocalDate startDate, LocalDate endDate) {
        cancelVenueBookingsForEvent(eventId);
        return bookVenue(venueId, eventId, startDate, endDate);
    }

    public List<Venue> getAvailableVenues(LocalDate date) {
        return getAvailableVenues(date, null);
    }

    public List<Venue> getAvailableVenues(LocalDate date, Integer expectedAttendees) {
        return getAvailableVenues(date, date, expectedAttendees);
    }

    public List<Venue> getAvailableVenues(LocalDate startDate, LocalDate endDate, Integer expectedAttendees) {
        return getAvailableVenues(startDate, endDate, expectedAttendees, null);
    }

    public List<Venue> getAvailableVenues(LocalDate startDate, LocalDate endDate, Integer expectedAttendees, String eventType) {
        if (startDate == null || (endDate != null && endDate.isBefore(startDate))) {
            throw new BusinessException("End date cannot be before start date", "INVALID_DATE_RANGE");
        }
        if (expectedAttendees != null && expectedAttendees < 1) {
            throw new BusinessException("Attendee count must be at least one", "INVALID_ATTENDEE_COUNT");
        }
        return venueRepository.findAll().stream()
                .filter(Venue::isActive)
                .filter(v -> !exceedsCapacity(v, expectedAttendees))
                .filter(v -> isVenueAvailableForRange(v, startDate, endDate, -1L, expectedAttendees, eventType))
                .toList();
    }

    public record DayAvailability(LocalDate date, boolean available) {}

    private static com.aicc.eventmanagement.util.VenueBookingWindow bookingWindow(
            Venue venue, String eventType, LocalDate start, LocalDate end) {
        return com.aicc.eventmanagement.util.VenueBookingWindow.forEvent(eventType, start, end,
                venue.getSetupBufferDays(), venue.getTeardownBufferDays());
    }

    @Transactional(readOnly = true)
    public List<DayAvailability> getAvailabilityCalendar(LocalDate start, LocalDate end, Integer attendees, String eventType) {
        if (end.isBefore(start) || end.isAfter(start.plusDays(30))) {
            throw new BusinessException("Choose a calendar range of up to 31 days", "INVALID_DATE_RANGE");
        }
        if (attendees != null && attendees < 1) {
            throw new BusinessException("Attendee count must be at least one", "INVALID_ATTENDEE_COUNT");
        }
        List<Venue> candidates = venueRepository.findAll().stream()
                .filter(Venue::isActive)
                .filter(venue -> !exceedsCapacity(venue, attendees))
                .toList();
        LocalDate today = LocalDate.now();
        return start.datesUntil(end.plusDays(1))
                .filter(date -> date.isAfter(today))
                .map(date -> new DayAvailability(date, candidates.stream()
                        .anyMatch(venue -> isVenueAvailableForRange(venue, date, date, -1L, attendees, eventType))))

                .toList();
    }

    /**

     * Evaluates every configured venue and explains the capacity and calendar
     * checks used for this event. The current event is excluded from conflict
     * counts so its own confirmed booking does not make its venue look blocked.
     */
    @Transactional(readOnly = true)
    public List<VenueFitResponse> explainVenueFit(
            LocalDate startDate, LocalDate endDate, Integer expectedAttendees, Long excludedEventId) {
        String eventType = excludedEventId == null ? null : eventRepository.findById(excludedEventId)
                .map(Event::getInquiry)
                .map(com.aicc.eventmanagement.entities.Inquiry::getEventType)
                .orElse(null);
        return explainVenueFit(startDate, endDate, expectedAttendees, excludedEventId, eventType);
    }

    @Transactional(readOnly = true)
    public List<VenueFitResponse> explainVenueFit(
            LocalDate startDate, LocalDate endDate, Integer expectedAttendees, Long excludedEventId, String eventType) {
        if (startDate == null || (endDate != null && endDate.isBefore(startDate))) {
            throw new BusinessException("End date cannot be before start date", "INVALID_DATE_RANGE");
        }
        if (expectedAttendees != null && expectedAttendees < 1) {
            throw new BusinessException("Attendee count must be at least one", "INVALID_ATTENDEE_COUNT");
        }

        LocalDate actualEndDate = endDate != null ? endDate : startDate;
        long eventIdToExclude = excludedEventId != null ? excludedEventId : -1L;
        return venueRepository.findAll().stream()
                .map(venue -> explainVenue(venue, startDate, actualEndDate,
                        expectedAttendees, eventIdToExclude, eventType))
                .toList();
    }

    private VenueFitResponse explainVenue(
            Venue venue, LocalDate startDate, LocalDate endDate,
            Integer expectedAttendees, Long excludedEventId, String eventType) {
        var window = bookingWindow(venue, eventType, startDate, endDate);
        LocalDate blockedFrom = window.from();
        LocalDate blockedThrough = window.through();
        List<String> explanation = new ArrayList<>();
        List<String> blockers = new ArrayList<>();

        if (venue.isActive()) {
            explanation.add("Venue is active.");
        } else {
            blockers.add("Venue is inactive and cannot be booked.");
        }

        if (expectedAttendees == null) {
            explanation.add("No attendee count was supplied, so capacity was not checked.");
        } else if (exceedsCapacity(venue, expectedAttendees)) {
            blockers.add("Capacity " + venue.getCapacity() + " is below "
                    + expectedAttendees + " expected attendees.");
        } else if (venue.getCapacity() == null) {
            explanation.add("No capacity limit is configured.");
        } else {
            explanation.add("Capacity fits " + expectedAttendees + " expected attendees.");
        }

        boolean blockedDate = unavailableDateRepository.existsByVenueIdAndUnavailableDateBetween(
                venue.getId(), blockedFrom, blockedThrough);
        if (blockedDate) {
            blockers.add("An administrator-blocked date overlaps the setup, event, or teardown window.");
        } else {
            explanation.add("No administrator-blocked date overlaps " + blockedFrom + " through " + blockedThrough + ".");
        }

        long confirmedBookings = venueBookingRepository.countConfirmedBookingsInRangeExcludingEvent(
                venue.getId(), blockedFrom, blockedThrough, excludedEventId);
        if (confirmedBookings > 0) {
            blockers.add("Another confirmed venue booking overlaps the setup, event, or teardown window.");
        }

        long scheduledEvents = eventRepository.countVenueEventsInRangeExcludingEvent(
                venue.getId(), blockedFrom, blockedThrough, DEAD_STATUSES, excludedEventId);
        if (scheduledEvents > 0) {
            blockers.add("Another active event uses this venue during the setup, event, or teardown window.");
        }

        explanation.addAll(blockers);
        return new VenueFitResponse(venue.getId(), venue.getName(), venue.getLocation(),
                venue.getCapacity(), venue.isActive(), blockers.isEmpty(), blockedFrom, blockedThrough,
                List.copyOf(explanation), List.copyOf(blockers));
    }

    /**
     * Books a venue for an event on a specific date range with setup/teardown buffers.
     * Uses database-level unique constraint (uq_venue_date) to prevent double-booking.

     */
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


    @Transactional
    public List<VenueBooking> bookVenue(Long venueId, Long eventId, LocalDate startDate, LocalDate endDate) {
        Venue venue = getByIdForUpdate(venueId);
        if (!venue.isActive()) {
            throw new BusinessException("Inactive venues cannot be booked", "VENUE_INACTIVE");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));


        Integer expectedAttendees = event.getInquiry() != null
                ? event.getInquiry().getExpectedAttendees() : null;
        if (exceedsCapacity(venue, expectedAttendees)) {
            throw new BusinessException(
                    String.format("Venue capacity is %d, but this event expects %d attendees.",
                            venue.getCapacity(), expectedAttendees),
                    "VENUE_CAPACITY_EXCEEDED");
        }

        if (startDate == null) {
            throw new BusinessException("Start date is required", "INVALID_DATE_RANGE");
        }

        // 1. Validation: endDate cannot be before startDate
        LocalDate actualEndDate = (endDate != null) ? endDate : startDate;
        if (actualEndDate.isBefore(startDate)) {
            throw new BusinessException("End date cannot be before start date", "INVALID_DATE_RANGE");
        }

        // 2. Calculate the full blocked range including buffers
        String eventType = event.getInquiry() == null ? null : event.getInquiry().getEventType();
        var window = bookingWindow(venue, eventType, startDate, actualEndDate);
        LocalDate blockStart = window.from();
        LocalDate blockEnd = window.through();

        if (unavailableDateRepository.existsByVenueIdAndUnavailableDateBetween(venueId, blockStart, blockEnd)) {
            throw new BusinessException("Venue is unavailable during the event setup or booking period.",
                    "VENUE_UNAVAILABLE");
        }

        // 3. Check availability for the ENTIRE block using a single efficient query
        long conflicts = venueBookingRepository.countConfirmedBookingsInRange(venueId, blockStart, blockEnd);
        long legacyConflicts = eventRepository.countVenueEventsInRangeExcludingEvent(
                venueId, blockStart, blockEnd, DEAD_STATUSES, eventId);
        if (conflicts > 0 || legacyConflicts > 0) {
            throw new BusinessException(
                String.format("Venue %s is already booked on one or more days between %s and %s (including setup/teardown).",
                venue.getName(), blockStart, blockEnd),
                "VENUE_CONFLICT");
        }

        // 4. Insert a booking row for EVERY day in the block
        List<VenueBooking> bookings = new ArrayList<>();
        LocalDate insertDate = blockStart;
        while (!insertDate.isAfter(blockEnd)) {
            LocalDate bookingDate = insertDate;
            VenueBooking booking = venueBookingRepository.findByVenueAndDate(venueId, bookingDate)
                    .map(existing -> {
                        if (existing.getStatus() == VenueBooking.BookingStatus.CONFIRMED) {
                            throw new BusinessException("Venue is already booked on " + bookingDate, "VENUE_CONFLICT");
                        }
                        existing.setEvent(event);
                        existing.setStatus(VenueBooking.BookingStatus.CONFIRMED);
                        return existing;
                    })
                    .orElseGet(() -> VenueBooking.builder()
                            .venue(venue)
                            .event(event)
                            .bookingDate(bookingDate)
                            .status(VenueBooking.BookingStatus.CONFIRMED)
                            .build());
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


    @Transactional(readOnly = true)
    public List<VenueBookingResponse> getVenueBookings(Long venueId) {
        getById(venueId); // 404 if the venue doesn't exist
        List<VenueBooking> bookings = venueBookingRepository.findByVenueId(venueId);
        return bookings.stream()
                .map(VenueBookingResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VenueUnavailableDate> getUnavailableDates(Long venueId) {
        getById(venueId);
        return unavailableDateRepository.findByVenueIdOrderByUnavailableDateAsc(venueId);
    }

    @Transactional
    public VenueUnavailableDate addUnavailableDate(Long venueId, VenueUnavailableDateRequest request) {
        Venue venue = getByIdForUpdate(venueId);
        LocalDate date = request.getDate();
        if (date == null) {
            throw new BusinessException("Unavailable date is required", "INVALID_DATE");
        }
        if (date.isBefore(LocalDate.now())) {
            throw new BusinessException("Unavailable dates must be today or in the future", "INVALID_DATE");
        }
        if (unavailableDateRepository.existsByVenueIdAndUnavailableDate(venueId, date)) {
            throw new BusinessException("This date is already marked unavailable", "DATE_ALREADY_BLOCKED");
        }
        boolean hasConfirmedBooking = venueBookingRepository.countConfirmedBookingsInRange(venueId, date, date) > 0;
        boolean hasLegacyEvent = eventRepository.countVenueEventsInRangeExcludingEvent(
                venueId, date, date, DEAD_STATUSES, -1L) > 0;
        if (hasConfirmedBooking || hasLegacyEvent) {
            throw new BusinessException("A booked event already uses this venue on that date", "VENUE_CONFLICT");
        }

        return unavailableDateRepository.save(VenueUnavailableDate.builder()
                .venue(venue)
                .unavailableDate(date)
                .reason(request.getReason() == null || request.getReason().isBlank()
                        ? null : request.getReason().trim())
                .build());
    }

    @Transactional
    public void removeUnavailableDate(Long venueId, Long unavailableDateId) {
        VenueUnavailableDate blockedDate = unavailableDateRepository.findByIdAndVenueId(unavailableDateId, venueId)
                .orElseThrow(() -> new EntityNotFoundException("Unavailable date not found for venue", unavailableDateId));
        unavailableDateRepository.delete(blockedDate);
    }

    private boolean exceedsCapacity(Venue venue, Integer expectedAttendees) {
        return venue.getCapacity() != null && expectedAttendees != null
                && expectedAttendees > venue.getCapacity();
    }

    Venue getByIdForUpdate(Long id) {
        return venueRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Venue not found with id: " + id));
    }
}
