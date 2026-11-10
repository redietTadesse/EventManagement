package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.CreateVenueRequest;
import com.aicc.eventmanagement.payload.HoldVenueRequest;
import com.aicc.eventmanagement.payload.UpdateVenueRequest;
import com.aicc.eventmanagement.payload.VenueAvailabilityGridResponse;
import com.aicc.eventmanagement.payload.VenueAvailabilityResponse;
import com.aicc.eventmanagement.payload.VenueBookingResponse;
import com.aicc.eventmanagement.payload.VenueFitResponse;
import com.aicc.eventmanagement.payload.VenueResponse;
import com.aicc.eventmanagement.payload.VenueUnavailableDateRequest;
import com.aicc.eventmanagement.payload.VenueUnavailableDateResponse;
import com.aicc.eventmanagement.services.VenueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/venues")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Venue Management", description = "CRUD, availability and hold endpoints for venues")
public class VenueController {
    private final VenueService venueService;

    @GetMapping
    @Operation(summary = "List all venues")
    public ResponseEntity<List<VenueResponse>> getAll() {
        return ResponseEntity.ok(venueService.getAll().stream().map(VenueResponse::from).toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a venue by id")
    public ResponseEntity<VenueResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(VenueResponse.from(venueService.getById(id)));
    }

    @GetMapping("/availability-grid")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Venue availability grid")
    public ResponseEntity<VenueAvailabilityGridResponse> availabilityGrid(
            @RequestParam(defaultValue = "30") int daysAhead) {
        return ResponseEntity.ok(venueService.getAvailabilityGrid(daysAhead));
    }

    @GetMapping("/{id}/availability")
    public ResponseEntity<VenueAvailabilityResponse> checkAvailability(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) @Min(1) Integer attendees) {
        return ResponseEntity.ok(new VenueAvailabilityResponse(id, date,
                venueService.isVenueAvailable(id, date, endDate != null ? endDate : date, attendees)));
    }

    @GetMapping("/{id}/bookings")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public ResponseEntity<List<VenueBookingResponse>> getVenueBookings(@PathVariable Long id) {
        return ResponseEntity.ok(venueService.getVenueBookings(id));
    }

    @GetMapping("/available")
    @Operation(summary = "List venues free on a date",
            description = "Returns active venues with no booking or live hold on the given date.")
    public ResponseEntity<List<VenueResponse>> availableOn(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) @Min(1) Integer attendees,
            @RequestParam(required = false) String eventType) {
        return ResponseEntity.ok(venueService.getAvailableVenues(date, endDate != null ? endDate : date,
                        attendees, eventType).stream().map(VenueResponse::from).toList());
    }

    @GetMapping("/availability/calendar")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    public List<VenueService.DayAvailability> availabilityCalendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) Integer attendees,
            @RequestParam(required = false) String eventType) {
        return venueService.getAvailabilityCalendar(start, end, attendees, eventType);
    }

    public record VenueAvailabilityReason(Long venueId, String name, boolean available, List<String> reasons) {}

    @GetMapping("/availability/reasons")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    public List<VenueAvailabilityReason> availabilityReasons(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer attendees,
            @RequestParam(required = false) String eventType) {
        return venueService.explainVenueFit(date, endDate, attendees, null, eventType).stream()
                .map(v -> new VenueAvailabilityReason(v.venueId(), v.name(), v.eligible(), v.blockers())).toList();
    }

    @GetMapping("/availability/explanations")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public ResponseEntity<List<VenueFitResponse>> explainAvailability(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) @Min(1) Integer attendees,
            @RequestParam(required = false) Long excludeEventId) {
        return ResponseEntity.ok(venueService.explainVenueFit(date, endDate, attendees, excludeEventId));
    }

    @PostMapping("/{id}/hold")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Hold venue dates",
            description = "Holds a venue for N days starting on startDate. The hold expires "
                    + "automatically after app.venue.hold-expiry-hours.")
    public ResponseEntity<List<VenueBookingResponse>> hold(
            @PathVariable Long id,
            @Valid @RequestBody HoldVenueRequest request,
            Authentication authentication) {

        String heldBy = authentication != null ? authentication.getName() : "system";
        List<VenueBookingResponse> holds = venueService
                .holdVenue(id, request.getStartDate(), request.getDays(), heldBy)
                .stream()
                .map(VenueBookingResponse::from)
                .toList();

        return ResponseEntity.status(HttpStatus.CREATED).body(holds);
    }

    @DeleteMapping("/holds/{bookingId}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Release a held date")
    public ResponseEntity<Void> releaseHold(@PathVariable Long bookingId) {
        venueService.releaseHold(bookingId);
        return ResponseEntity.noContent().build();
    }
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VenueResponse> create(@Valid @RequestBody CreateVenueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(VenueResponse.from(venueService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VenueResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateVenueRequest request) {
        return ResponseEntity.ok(VenueResponse.from(venueService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        venueService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/unavailable-dates")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<VenueUnavailableDateResponse>> getUnavailableDates(@PathVariable Long id) {
        return ResponseEntity.ok(venueService.getUnavailableDates(id).stream().map(VenueUnavailableDateResponse::from).toList());
    }

    @PostMapping("/{id}/unavailable-dates")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VenueUnavailableDateResponse> addUnavailableDate(
            @PathVariable Long id, @Valid @RequestBody VenueUnavailableDateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(VenueUnavailableDateResponse.from(venueService.addUnavailableDate(id, request)));
    }

    @DeleteMapping("/{id}/unavailable-dates/{unavailableDateId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeUnavailableDate(@PathVariable Long id, @PathVariable Long unavailableDateId) {
        venueService.removeUnavailableDate(id, unavailableDateId);
        return ResponseEntity.noContent().build();
    }
}
