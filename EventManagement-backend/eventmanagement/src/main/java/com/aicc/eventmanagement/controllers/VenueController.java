package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.CreateVenueRequest;
import com.aicc.eventmanagement.payload.UpdateVenueRequest;
import com.aicc.eventmanagement.payload.VenueResponse;
import com.aicc.eventmanagement.services.VenueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/venues")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Venue Management", description = "CRUD endpoints for venues")
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
}