package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.payload.ManualAssignRequest;
import com.aicc.eventmanagement.payload.RateAssignmentRequest;
import com.aicc.eventmanagement.payload.VendorAssignmentResponse;
import com.aicc.eventmanagement.payload.VendorResponseRequest;
import com.aicc.eventmanagement.services.VendorService;
import com.aicc.eventmanagement.services.WorkflowEngine;
import com.aicc.eventmanagement.repositories.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
    private final WorkflowEngine workflowEngine;
    private final UserRepository userRepository;

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
            @Valid @RequestBody ManualAssignRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        var actor = userRepository.findByUsername(principal.getUsername())
            .orElseThrow(() -> new BusinessException("Coordinator account not found", "ACCESS_DENIED"));
        VendorAssignment assignment = vendorService.manualAssign(
            eventId,
            request.getCategory(),
            request.getVendorId(),
            request.getReason(),
            actor.getId(),
            actor.getUsername()
        );
        return ResponseEntity.ok(VendorAssignmentResponse.from(assignment));
    }

    @PatchMapping("/{id}/respond")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Vendor responds to assignment (ACCEPTED or DECLINED)")
    public ResponseEntity<VendorAssignmentResponse> respondToAssignment(
            @PathVariable Long id,
            @Valid @RequestBody VendorResponseRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        Vendor caller = vendorService.getVendorByUser(principal.getUsername());
        VendorAssignment assignment = vendorService.getAssignmentById(id);

        if (assignment.getVendor() == null
                || !assignment.getVendor().getId().equals(caller.getId())) {
            throw new BusinessException(
                "You can only respond to your own assignments",
                "ACCESS_DENIED");
        }

        VendorAssignment updated = vendorService.respondToAssignment(
            id, request.getResponse(), request.getDeclineReason());
        return ResponseEntity.ok(VendorAssignmentResponse.from(updated));
    }

    // ============ BROWSE-AND-VOLUNTEER ENDPOINTS ============

    @GetMapping("/open")
    @PreAuthorize("hasAnyRole('VENDOR', 'COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get open assignments for the authenticated vendor's service category")
    public ResponseEntity<List<VendorAssignmentResponse>> getOpenAssignments(
            @AuthenticationPrincipal UserDetails principal) {

        // Coordinators/Admins see ALL open assignments; vendors see only their own category
        if (hasAnyRole(principal, "COORDINATOR", "ADMIN")) {
            List<VendorAssignment> allOpen = vendorService.getOpenAssignmentsForCoordinator();
            return ResponseEntity.ok(allOpen.stream()
                .map(VendorAssignmentResponse::from)
                .collect(Collectors.toList()));
        }

        Vendor vendor = vendorService.getVendorByUser(principal.getUsername());
        List<VendorAssignment> openAssignments = vendorService.getOpenAssignmentsForCategory(vendor.getServiceCategory());
        return ResponseEntity.ok(openAssignments.stream()
            .map(VendorAssignmentResponse::from)
            .collect(Collectors.toList()));
    }

    private boolean hasAnyRole(UserDetails principal, String... roles) {
        if (principal == null) return false;
        java.util.Set<String> userRoles = principal.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .collect(java.util.stream.Collectors.toSet());
        return java.util.Arrays.stream(roles).anyMatch(userRoles::contains);
    }

    @PostMapping("/{id}/claim")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Claim an open assignment (transitions OPEN → PENDING)")
    public ResponseEntity<VendorAssignmentResponse> claimAssignment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {
        Vendor vendor = vendorService.getVendorByUser(principal.getUsername());
        VendorAssignment assignment = vendorService.claimOpenAssignment(id, vendor.getId());
        return ResponseEntity.ok(VendorAssignmentResponse.from(assignment));
    }

    @PostMapping("/{id}/rate")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Rate a completed vendor assignment")
    public ResponseEntity<VendorAssignmentResponse> rate(
            @PathVariable Long id,
            @Valid @RequestBody RateAssignmentRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        Long clientId = userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND"))
                .getId();
        VendorAssignment assignment = vendorService.rateAssignment(
                id, request.getRating(), request.getComment(), clientId);
        return ResponseEntity.ok(VendorAssignmentResponse.from(assignment));
    }

    // ============ COORDINATOR FALLBACK ============

    @PostMapping("/{id}/force-assign")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Coordinator force-assigns a vendor to an open/unclaimed assignment")
    public ResponseEntity<VendorAssignmentResponse> forceAssign(
            @PathVariable Long id,
            @Valid @RequestBody ManualAssignRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        var actor = userRepository.findByUsername(principal.getUsername())
            .orElseThrow(() -> new BusinessException("Coordinator account not found", "ACCESS_DENIED"));
        VendorAssignment assignment = vendorService.forceAssignToOpenAssignment(
            id,
            request.getVendorId(),
            request.getCategory(),
            request.getReason(),
            actor.getId(),
            actor.getUsername()
        );
        return ResponseEntity.ok(VendorAssignmentResponse.from(assignment));
    }

    // ============ MY ASSIGNMENTS (vendor-scoped) ============

    @GetMapping("/me")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Get the authenticated vendor's assignments")
    public ResponseEntity<List<VendorAssignmentResponse>> getMyAssignments(
            @AuthenticationPrincipal UserDetails principal) {

        Vendor vendor = vendorService.getVendorByUserOptional(principal.getUsername());
        if (vendor == null) {
            return ResponseEntity.notFound().build();
        }
        List<VendorAssignment> assignments = vendorService.getAssignmentsByVendor(vendor.getId());
        return ResponseEntity.ok(assignments.stream()
            .map(VendorAssignmentResponse::from)
            .collect(Collectors.toList()));
    }

    @GetMapping("/me/{id}")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Get one of the authenticated vendor's assignments by ID")
    public ResponseEntity<VendorAssignmentResponse> getMyAssignment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {

        Vendor vendor = vendorService.getVendorByUserOptional(principal.getUsername());
        if (vendor == null) {
            return ResponseEntity.notFound().build();
        }
        VendorAssignment assignment = vendorService.getAssignmentById(id);

        if (assignment.getVendor() == null
                || !assignment.getVendor().getId().equals(vendor.getId())) {
            throw new BusinessException(
                "You can only view your own assignments",
                "ACCESS_DENIED");
        }
        return ResponseEntity.ok(VendorAssignmentResponse.from(assignment));
    }
}
