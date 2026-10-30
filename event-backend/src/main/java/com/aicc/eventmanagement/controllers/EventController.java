package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.payload.EventResponse;
import com.aicc.eventmanagement.payload.EventReadinessResponse;
import com.aicc.eventmanagement.services.VendorService;
import com.aicc.eventmanagement.payload.UpdateEventRequest;
import com.aicc.eventmanagement.services.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.time.LocalDate;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Event Management", description = "Endpoints for managing events")
public class EventController {

    private final EventService eventService;
    private final VendorService vendorService;

    @PostMapping
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Create a new event", description = "Creates a new event manually (usually created from inquiry)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Event created successfully",
                    content = @Content(schema = @Schema(implementation = EventResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody Event event) {
        log.info("Creating event: {}", event.getName());
        Event created = eventService.createEvent(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(EventResponse.from(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT', 'VENDOR')")
    @Operation(summary = "Get all events", description = "Returns a list of all events")
    public ResponseEntity<List<EventResponse>> getAllEvents() {
        log.info("Fetching all events");
        List<Event> events = eventService.getAllEvents();
        List<EventResponse> responses = events.stream()
                .map(EventResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT', 'VENDOR')")
    @Operation(summary = "Get event by ID")
    public ResponseEntity<EventResponse> getEventById(
            @Parameter(description = "Event ID", example = "1") @PathVariable Long id) {
        log.info("Fetching event with id: {}", id);
        Event event = eventService.getEventById(id);
        return ResponseEntity.ok(EventResponse.from(event));
    }

    @GetMapping("/{id}/readiness")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT')")
    @Operation(summary = "Get event readiness")
    public ResponseEntity<EventReadinessResponse> getReadiness(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventReadiness(id));
    }

    @GetMapping("/{id}/impact")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Analyze the impact of changing an event date")
    public ResponseEntity<Map<String, Object>> analyzeDateChangeImpact(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newDate) {
        return ResponseEntity.ok(eventService.analyzeDateChangeImpact(id, newDate));
    }

    @PutMapping("/{id}/date")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Reschedule an event after validating date impact")
    public ResponseEntity<EventResponse> changeEventDate(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newDate) {
        return ResponseEntity.ok(EventResponse.from(eventService.changeEventDate(id, newDate)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get events by status")
    public ResponseEntity<List<EventResponse>> getEventsByStatus(@PathVariable EventStatus status) {
        log.info("Fetching events with status: {}", status);
        List<Event> events = eventService.getEventsByStatus(status);
        List<EventResponse> responses = events.stream()
                .map(EventResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/inquiry/{inquiryId}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT')")
    @Operation(summary = "Get event by inquiry ID")
    public ResponseEntity<EventResponse> getEventByInquiryId(@PathVariable Long inquiryId) {
        log.info("Fetching event for inquiry: {}", inquiryId);
        Event event = eventService.getEventByInquiryId(inquiryId);
        return ResponseEntity.ok(EventResponse.from(event));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Update event", description = "Updates event details")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEventRequest request) {
        log.info("Updating event {}", id);
        Event updated = eventService.updateEvent(id, request);
        return ResponseEntity.ok(EventResponse.from(updated));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    @Operation(summary = "Update event status")
    public ResponseEntity<EventResponse> updateEventStatus(
            @PathVariable Long id,
            @RequestParam EventStatus status,
            @AuthenticationPrincipal UserDetails principal) {
        log.info("Updating event {} status to {}", id, status);
        Role userRole = extractRoleFromPrincipal(principal);
        Event updated = eventService.updateEventStatus(id, status, userRole);
        return ResponseEntity.ok(EventResponse.from(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete event", description = "Deletes an event (admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Event deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Event not found"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        log.info("Deleting event {}", id);
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/upcoming")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT', 'VENDOR')")
    @Operation(summary = "Get upcoming events", description = "Returns events that are not completed/cancelled")
    public ResponseEntity<List<EventResponse>> getUpcomingEvents() {
        log.info("Fetching upcoming events");
        List<Event> events = eventService.getUpcomingEvents();
        List<EventResponse> responses = events.stream()
                .map(EventResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}/categories")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get required vendor categories for an event",
            description = "Returns the list of vendor categories needed based on the event type")
    public ResponseEntity<List<String>> getEventCategories(@PathVariable Long id) {
        log.info("Fetching vendor categories for event {}", id);
        Event event = eventService.getEventById(id);

        // FIX: Removed the dead code below this return statement that caused the compile error
        return ResponseEntity.ok(vendorService.getRequiredCategoriesFor(event));
    }

    private Role extractRoleFromPrincipal(UserDetails principal) {
        if (principal == null || principal.getAuthorities().isEmpty()) {
            return Role.CLIENT;
        }

        String roleName = principal.getAuthorities().iterator().next().getAuthority();
        if (roleName.startsWith("ROLE_")) {
            roleName = roleName.substring(5);
        }
        return Role.valueOf(roleName);
    }
}
