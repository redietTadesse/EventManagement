package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.payload.ManualAssignRequest;
import com.aicc.eventmanagement.payload.VendorAssignmentResponse;
import com.aicc.eventmanagement.payload.VendorResponseRequest;
import com.aicc.eventmanagement.services.VendorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/assignments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Vendor Assignment", description = "Endpoints for vendor assignments")
public class AssignmentController {

    private final VendorService vendorService;

    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT')")
    @Operation(summary = "Get all assignments for an event")
    public ResponseEntity<List<VendorAssignmentResponse>> getAssignmentsByEvent(@PathVariable Long eventId) {
        List<VendorAssignment> assignments = vendorService.getAssignmentsByEvent(eventId);
        return ResponseEntity.ok(assignments.stream()
            .map(VendorAssignmentResponse::from)
            .collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'VENDOR')")
    @Operation(summary = "Get assignment by ID")
    public ResponseEntity<VendorAssignmentResponse> getAssignmentById(@PathVariable Long id) {
        VendorAssignment assignment = vendorService.getAssignmentById(id);
        return ResponseEntity.ok(VendorAssignmentResponse.from(assignment));
    }

    @PostMapping("/event/{eventId}/auto")
    @PreAuthorize("hasRole('COORDINATOR')")
    @Operation(summary = "Auto-assign vendors for an event")
    public ResponseEntity<List<VendorAssignmentResponse>> autoAssign(@PathVariable Long eventId) {
        List<VendorAssignment> assignments = vendorService.autoAssignForEvent(eventId);
        return ResponseEntity.ok(assignments.stream()
            .map(VendorAssignmentResponse::from)
            .collect(Collectors.toList()));
    }

    @PostMapping("/event/{eventId}/manual")
    @PreAuthorize("hasRole('COORDINATOR')")
    @Operation(summary = "Manually assign a vendor to an event")
    public ResponseEntity<VendorAssignmentResponse> manualAssign(
            @PathVariable Long eventId,
            @Valid @RequestBody ManualAssignRequest request) {
        VendorAssignment assignment = vendorService.manualAssign(
            eventId,
            request.getCategory(),
            request.getVendorId()
        );
        return ResponseEntity.ok(VendorAssignmentResponse.from(assignment));
    }

    @PatchMapping("/{id}/respond")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Vendor responds to assignment (ACCEPTED or DECLINED)")
    public ResponseEntity<VendorAssignmentResponse> respondToAssignment(
            @PathVariable Long id,
            @Valid @RequestBody VendorResponseRequest request) {
        VendorAssignment assignment = vendorService.respondToAssignment(
            id,
            request.getResponse(),
            request.getDeclineReason()
        );
        return ResponseEntity.ok(VendorAssignmentResponse.from(assignment));
    }
}