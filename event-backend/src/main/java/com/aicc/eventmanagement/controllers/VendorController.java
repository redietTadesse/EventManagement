package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.payload.AvailabilityGridResponse;
import com.aicc.eventmanagement.payload.CreateVendorRequest;
import com.aicc.eventmanagement.payload.UpdateVendorRequest;
import com.aicc.eventmanagement.payload.VendorApplyRequest;
import com.aicc.eventmanagement.payload.VendorApplyResponse;
import com.aicc.eventmanagement.payload.VendorAssignmentResponse;
import com.aicc.eventmanagement.payload.VendorPerformanceResponse;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.services.AvailabilityService;
import com.aicc.eventmanagement.services.ConflictResolutionService;
import com.aicc.eventmanagement.services.ConflictResolutionService.AlternativeVendor;
import com.aicc.eventmanagement.services.ConflictResolutionService.ResolutionSuggestion;
import com.aicc.eventmanagement.services.VendorRatingService;
import com.aicc.eventmanagement.services.VendorRatingService.RatingStats;
import com.aicc.eventmanagement.services.VendorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/vendors")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Vendor Management", description = "Endpoints for managing vendors")
public class VendorController {

    private final AvailabilityService availabilityService;
    private final VendorService vendorService;
    private final VendorRatingService ratingService;
    private final ConflictResolutionService conflictService;
    private final UserRepository userRepository;

    @GetMapping("/availability-grid")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get availability grid for vendors", description = "Returns a 30-day availability grid for all active vendors in a category")
    public ResponseEntity<AvailabilityGridResponse> getAvailabilityGrid(
            @RequestParam String category,
            @RequestParam(defaultValue = "30") int daysAhead) {
        log.info("Fetching availability grid for category: {}, daysAhead: {}", category, daysAhead);
        return ResponseEntity.ok(availabilityService.getAvailabilityGrid(category, daysAhead));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT')")
    @Operation(summary = "Get all vendors")
    public ResponseEntity<List<Vendor>> getAllVendors() {
        return ResponseEntity.ok(vendorService.getAllVendors());
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get all active vendors")
    public ResponseEntity<List<Vendor>> getActiveVendors() {
        return ResponseEntity.ok(vendorService.getActiveVendors());
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Get the authenticated vendor's profile")
    public ResponseEntity<Vendor> getMyProfile(@AuthenticationPrincipal UserDetails principal) {
        Vendor vendor = vendorService.getVendorByUserOptional(principal.getUsername());
        if (vendor == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(vendor);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT')")
    @Operation(summary = "Get vendor by ID")
    public ResponseEntity<Vendor> getVendorById(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.getVendorById(id));
    }

    @PostMapping("/apply")
    @Operation(summary = "Public vendor application", description = "Creates an inactive vendor profile for admin review. No authentication required.")
    public ResponseEntity<VendorApplyResponse> applyAsVendor(@Valid @RequestBody VendorApplyRequest request) {
        Vendor created = vendorService.applyForOnboarding(request);
        User user = created.getUserId() != null
                ? userRepository.findById(created.getUserId()).orElse(null)
                : null;
        String username = user != null ? user.getUsername() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(new VendorApplyResponse(
                "Application received. An administrator will review it and activate your account.",
                created.getCompanyName(),
                username
        ));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a vendor (admin only)", description = "Creates a User account with role=VENDOR and a linked Vendor profile atomically")
    public ResponseEntity<Vendor> createVendor(@Valid @RequestBody CreateVendorRequest request) {
        Vendor created = vendorService.createVendor(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a vendor (admin only)")
    public ResponseEntity<Vendor> updateVendor(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVendorRequest request) {
        Vendor updated = vendorService.updateVendor(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate or deactivate a vendor (admin only)")
    public ResponseEntity<Vendor> toggleVendorActive(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.toggleActive(id));
    }

    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get vendors by service category")
    public ResponseEntity<List<Vendor>> getVendorsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(vendorService.getVendorsByCategory(category));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Search vendors by company name")
    public ResponseEntity<List<Vendor>> searchVendors(@RequestParam String name) {
        return ResponseEntity.ok(vendorService.searchVendorsByName(name));
    }

    @GetMapping("/available")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get available vendors by category and date")
    public ResponseEntity<List<Vendor>> getAvailableVendors(
            @RequestParam String category,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(vendorService.findAvailableVendors(category, date));
    }

    @GetMapping("/{id}/assignments")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'VENDOR')")
    @Operation(summary = "Get all assignments for a vendor")
    public ResponseEntity<List<VendorAssignmentResponse>> getVendorAssignments(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {
        if (hasRole(principal, Role.VENDOR) && !isVendorIdMatch(id, principal)) {
            throw new BusinessException("You can only view your own assignments", "ACCESS_DENIED");
        }
        List<VendorAssignment> assignments = vendorService.getAssignmentsByVendor(id);
        boolean includeDecisionSnapshots = hasRole(principal, Role.COORDINATOR) || hasRole(principal, Role.ADMIN);
        return ResponseEntity.ok(assignments.stream()
                .map(assignment -> VendorAssignmentResponse.from(assignment, includeDecisionSnapshots))
                .collect(Collectors.toList()));
    }

    @GetMapping("/{id}/pending")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'VENDOR')")
    @Operation(summary = "Get pending assignments for a vendor")
    public ResponseEntity<List<VendorAssignmentResponse>> getPendingAssignments(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {
        if (hasRole(principal, Role.VENDOR) && !isVendorIdMatch(id, principal)) {
            throw new BusinessException("You can only view your own pending assignments", "ACCESS_DENIED");
        }
        List<VendorAssignment> assignments = vendorService.getPendingAssignmentsForVendor(id);
        return ResponseEntity.ok(assignments.stream().map(VendorAssignmentResponse::from).collect(Collectors.toList()));
    }

    @GetMapping("/{id}/load")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get active assignment count for a vendor")
    public ResponseEntity<Long> getVendorLoad(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.countActiveAssignmentsForVendor(id));
    }

    @PostMapping("/{id}/booked-dates")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Add a booked date for a vendor")
    public ResponseEntity<Void> addBookedDate(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        vendorService.addBookedDate(id, date);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/booked-dates")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove a booked date for a vendor")
    public ResponseEntity<Void> removeBookedDate(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        vendorService.removeBookedDate(id, date);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/rating")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get vendor rating")
    public ResponseEntity<Double> getVendorRating(@PathVariable Long id) {
        return ResponseEntity.ok(ratingService.calculateVendorRating(id));
    }

    @GetMapping("/{id}/rating/stats")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get vendor rating statistics")
    public ResponseEntity<RatingStats> getVendorRatingStats(@PathVariable Long id) {
        return ResponseEntity.ok(ratingService.getVendorRatingStats(id));
    }

    @GetMapping("/{id}/performance")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get a vendor's performance profile and recent reviews")
    public ResponseEntity<VendorPerformanceResponse> getVendorPerformance(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.getVendorPerformance(id));
    }

    @GetMapping("/{id}/conflicts")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get conflicts for a vendor on a date")
    public ResponseEntity<List<ConflictResolutionService.Conflict>> getConflicts(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(conflictService.getVendorConflicts(id, date));
    }

    @GetMapping("/alternatives")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Find alternative vendors for a category and date")
    public ResponseEntity<List<AlternativeVendor>> getAlternatives(
            @RequestParam String category,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long excludeVendorId) {
        return ResponseEntity.ok(conflictService.suggestAlternatives(category, date, excludeVendorId));
    }

    @GetMapping("/assignments/{assignmentId}/alternatives")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Find alternative vendors for a declined assignment")
    public ResponseEntity<List<AlternativeVendor>> getAlternativesForAssignment(@PathVariable Long assignmentId) {
        return ResponseEntity.ok(conflictService.suggestAlternativesForAssignment(assignmentId));
    }

    @GetMapping("/resolution-suggestion")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get comprehensive resolution suggestion for a vendor conflict")
    public ResponseEntity<ResolutionSuggestion> getResolutionSuggestion(
            @RequestParam Long vendorId,
            @RequestParam String category,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long eventId) {
        return ResponseEntity.ok(conflictService.getResolutionSuggestion(vendorId, category, date, eventId));
    }

    @PostMapping("/recalculate-ratings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Recalculate ratings for all vendors")
    public ResponseEntity<Void> recalculateAllRatings() {
        ratingService.recalculateAllVendorRatings();
        return ResponseEntity.ok().build();
    }

    private boolean hasRole(UserDetails principal, Role role) {
        if (principal == null) return false;
        return principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role.name()));
    }

    private boolean isVendorIdMatch(Long vendorId, UserDetails principal) {
        if (principal == null) return false;
        try {
            User user = userRepository.findByUsername(principal.getUsername()).orElse(null);
            if (user != null) {
                Vendor vendor = vendorService.getVendorByUserOptional(principal.getUsername());
                if (vendor == null) {
                    return false;
                }
                return vendor.getId().equals(vendorId);
            }
        } catch (Exception e) {
            log.debug("Failed to resolve vendor for user: {}", principal.getUsername());
        }
        return false;
    }
}
