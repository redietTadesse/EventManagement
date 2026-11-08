package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.CreateVenueRequest;
import com.aicc.eventmanagement.payload.UpdateVenueRequest;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;

import java.time.LocalDate;
import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/venues")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Venue Management", description = "CRUD and availability endpoints for venues")
public class VenueController {

    private final VenueService venueService;

    @GetMapping
    @Operation(summary = "List all venues")
    public ResponseEntity<List<VenueResponse>> getAll() {
        List<VenueResponse> venues = venueService.getAll().stream()
                .map(VenueResponse::from)
                .toList();
        return ResponseEntity.ok(venues);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a venue by id")
    public ResponseEntity<VenueResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(VenueResponse.from(venueService.getById(id)));
    }

    @GetMapping("/{id}/availability")
    @Operation(summary = "Check if a venue is free on a date",
            description = "Returns { venueId, date, available }. Date format: yyyy-MM-dd")
    public ResponseEntity<VenueAvailabilityResponse> checkAvailability(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) @Min(1) Integer attendees) {
        boolean available = venueService.isVenueAvailable(id, date, endDate != null ? endDate : date, attendees);
        return ResponseEntity.ok(new VenueAvailabilityResponse(id, date, available));
    }

    @GetMapping("/{id}/bookings")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get bookings for a venue",
            description = "Returns all events booked at this venue")
    public ResponseEntity<List<VenueBookingResponse>> getVenueBookings(@PathVariable Long id) {
        return ResponseEntity.ok(venueService.getVenueBookings(id));
    }

    @GetMapping("/available")
    @Operation(summary = "List venues free on a date",
            description = "Returns active venues with no booking on the given date.")
    public ResponseEntity<List<VenueResponse>> availableOn(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) @Min(1) Integer attendees) {
        List<VenueResponse> venues = venueService.getAvailableVenues(date,
                        endDate != null ? endDate : date, attendees).stream()
                .map(VenueResponse::from)
                .toList();
        return ResponseEntity.ok(venues);
    }

    @GetMapping("/availability/calendar")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    public List<VenueService.DayAvailability> availabilityCalendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) Integer attendees) {
        return venueService.getAvailabilityCalendar(start, end, attendees);
    }

    public record VenueAvailabilityReason(Long venueId, String name, boolean available, List<String> reasons) {}

    @GetMapping("/availability/reasons")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    public List<VenueAvailabilityReason> availabilityReasons(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer attendees) {
        return venueService.explainVenueFit(date, endDate, attendees, null).stream()
                .map(venue -> new VenueAvailabilityReason(venue.venueId(), venue.name(), venue.eligible(), venue.blockers()))
                .toList();
    }

    @GetMapping("/availability/explanations")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Explain venue fit for an event date and attendance")
    public ResponseEntity<List<VenueFitResponse>> explainAvailability(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) @Min(1) Integer attendees,
            @RequestParam(required = false) Long excludeEventId) {
        return ResponseEntity.ok(venueService.explainVenueFit(date, endDate, attendees, excludeEventId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a venue (admin only)")
    public ResponseEntity<VenueResponse> create(@Valid @RequestBody CreateVenueRequest request) {
        VenueResponse created = VenueResponse.from(venueService.create(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a venue (admin only)")
    public ResponseEntity<VenueResponse> update(@PathVariable Long id,
                                                @Valid @RequestBody UpdateVenueRequest request) {
        return ResponseEntity.ok(VenueResponse.from(venueService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a venue (admin only)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        venueService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/unavailable-dates")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List administrator-managed unavailable dates")
    public ResponseEntity<List<VenueUnavailableDateResponse>> getUnavailableDates(@PathVariable Long id) {
        return ResponseEntity.ok(venueService.getUnavailableDates(id).stream()
                .map(VenueUnavailableDateResponse::from)
                .toList());
    }

    @PostMapping("/{id}/unavailable-dates")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Block a venue date (admin only)")
    public ResponseEntity<VenueUnavailableDateResponse> addUnavailableDate(
            @PathVariable Long id, @Valid @RequestBody VenueUnavailableDateRequest request) {
        VenueUnavailableDateResponse response = VenueUnavailableDateResponse.from(
                venueService.addUnavailableDate(id, request));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{id}/unavailable-dates/{unavailableDateId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove an administrator-managed unavailable date")
    public ResponseEntity<Void> removeUnavailableDate(
            @PathVariable Long id, @PathVariable Long unavailableDateId) {
        venueService.removeUnavailableDate(id, unavailableDateId);
        return ResponseEntity.noContent().build();
    }
}
