package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.payload.AvailabilityGridResponse;
import com.aicc.eventmanagement.payload.CreateVendorRequest;
import com.aicc.eventmanagement.payload.UpdateVendorRequest;
import com.aicc.eventmanagement.payload.VendorAssignmentResponse;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.services.AvailabilityService;
import com.aicc.eventmanagement.services.ConflictResolutionService;
import com.aicc.eventmanagement.services.ConflictResolutionService.AlternativeVendor;
import com.aicc.eventmanagement.services.ConflictResolutionService.ResolutionSuggestion;
import com.aicc.eventmanagement.services.VendorRatingService;
import com.aicc.eventmanagement.services.VendorRatingService.RatingStats;
import com.aicc.eventmanagement.services.VendorService;
import com.aicc.eventmanagement.util.CategoryUtils;
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

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Vendor> createVendor(
            @Valid @RequestBody CreateVendorRequest request) {
        return ResponseEntity.status(201).body(vendorService.createVendor(request));
    }

    @PostMapping("/apply")
    @Operation(summary = "Submit a vendor application for administrator review")
    public ResponseEntity<java.util.Map<String, Object>> apply(
            @Valid @RequestBody com.aicc.eventmanagement.payload.VendorApplyRequest request) {
        Vendor vendor = vendorService.applyForOnboarding(request);
        User user = userRepository.findById(vendor.getUserId()).orElseThrow();
        return ResponseEntity.status(201).body(java.util.Map.of(
                "id", vendor.getId(), "username", user.getUsername(),
                "message", "Application received. AICC will review your details before activating your account."));
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Vendor> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.toggleActive(id));
    }

    @GetMapping("/{id}/performance")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public ResponseEntity<com.aicc.eventmanagement.payload.VendorPerformanceResponse> performance(
            @PathVariable Long id) {
        return ResponseEntity.ok(vendorService.getVendorPerformance(id));
    }

    @GetMapping("/service-categories")
    @Operation(summary = "Get canonical vendor service categories")
    public ResponseEntity<List<String>> getServiceCategories(
            @RequestParam(required = false) String eventType) {
        return ResponseEntity.ok(eventType == null || eventType.isBlank()
                ? CategoryUtils.allCategories()
                : CategoryUtils.categoriesForEventType(eventType));
    }

    // =========================================================
    // AVAILABILITY
    // =========================================================

    @GetMapping("/availability-grid")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get availability grid for vendors")
    public ResponseEntity<AvailabilityGridResponse> getAvailabilityGrid(
            @RequestParam String category,
            @RequestParam(defaultValue = "30") int daysAhead) {

        log.info("Fetching availability grid for category: {}, daysAhead: {}",
                category, daysAhead);

        return ResponseEntity.ok(
                availabilityService.getAvailabilityGrid(category, daysAhead));
    }

    // =========================================================
    // GET ALL VENDORS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT')")
    @Operation(summary = "Get all vendors")
    public ResponseEntity<List<Vendor>> getAllVendors() {
        return ResponseEntity.ok(vendorService.getAllVendors());
    }

    // =========================================================
    // UPDATE VENDOR
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a vendor")
    public ResponseEntity<Vendor> updateVendor(@PathVariable Long id,
            @Valid @RequestBody UpdateVendorRequest request) {
        return ResponseEntity.ok(vendorService.updateVendor(id, request));
    }

    // =========================================================
    // GET ACTIVE VENDORS
    // =========================================================

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get all active vendors")
    public ResponseEntity<List<Vendor>> getActiveVendors() {
        return ResponseEntity.ok(vendorService.getActiveVendors());
    }

    // =========================================================
    // GET AUTHENTICATED VENDOR PROFILE
    // =========================================================

    @GetMapping("/me")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Get the authenticated vendor's profile")
    public ResponseEntity<Vendor> getMyProfile(
            @AuthenticationPrincipal UserDetails principal) {

        Vendor vendor = vendorService.getVendorByUser(principal.getUsername());

        return ResponseEntity.ok(vendor);
    }

    // =========================================================
    // GET VENDOR BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT')")
    @Operation(summary = "Get vendor by ID")
    public ResponseEntity<Vendor> getVendorById(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.getVendorById(id));
    }

    // =========================================================
    // GET VENDORS BY CATEGORY
    // =========================================================

    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get vendors by service category")
    public ResponseEntity<List<Vendor>> getVendorsByCategory(
            @PathVariable String category) {

        return ResponseEntity.ok(
                vendorService.getVendorsByCategory(category));
    }

    // =========================================================
    // SEARCH VENDORS
    // =========================================================

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Search vendors by company name")
    public ResponseEntity<List<Vendor>> searchVendors(
            @RequestParam String name) {

        return ResponseEntity.ok(
                vendorService.searchVendorsByName(name));
    }

    // =========================================================
    // GET AVAILABLE VENDORS
    // =========================================================

    @GetMapping("/available")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get available vendors by category and date")
    public ResponseEntity<List<Vendor>> getAvailableVendors(
            @RequestParam String category,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        return ResponseEntity.ok(
                vendorService.findAvailableVendors(category, date));
    }

    // =========================================================
    // GET VENDOR ASSIGNMENTS
    // =========================================================

    @GetMapping("/{id}/assignments")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'VENDOR')")
    @Operation(summary = "Get all assignments for a vendor")
    public ResponseEntity<List<VendorAssignmentResponse>> getVendorAssignments(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {

        if (hasRole(principal, Role.VENDOR)
                && !isVendorIdMatch(id, principal)) {

            throw new BusinessException(
                    "You can only view your own assignments",
                    "ACCESS_DENIED");
        }

        List<VendorAssignment> assignments =
                vendorService.getAssignmentsByVendor(id);

        return ResponseEntity.ok(
                assignments.stream()
                        .map(VendorAssignmentResponse::from)
                        .collect(Collectors.toList()));
    }

    // =========================================================
    // GET PENDING ASSIGNMENTS
    // =========================================================

    @GetMapping("/{id}/pending")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'VENDOR')")
    @Operation(summary = "Get pending assignments for a vendor")
    public ResponseEntity<List<VendorAssignmentResponse>> getPendingAssignments(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {

        if (hasRole(principal, Role.VENDOR)
                && !isVendorIdMatch(id, principal)) {

            throw new BusinessException(
                    "You can only view your own pending assignments",
                    "ACCESS_DENIED");
        }

        List<VendorAssignment> assignments =
                vendorService.getPendingAssignmentsForVendor(id);

        return ResponseEntity.ok(
                assignments.stream()
                        .map(VendorAssignmentResponse::from)
                        .collect(Collectors.toList()));
    }

    // =========================================================
    // GET VENDOR LOAD
    // =========================================================

    @GetMapping("/{id}/load")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get active assignment count for a vendor")
    public ResponseEntity<Long> getVendorLoad(@PathVariable Long id) {

        return ResponseEntity.ok(
                vendorService.countActiveAssignmentsForVendor(id));
    }

    // =========================================================
    // ADD BOOKED DATE
    // =========================================================

    @GetMapping("/{id}/booked-dates")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public ResponseEntity<List<LocalDate>> getBookedDates(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.getBookedDates(id));
    }

    @PostMapping("/{id}/booked-dates")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Add a booked date for a vendor")
    public ResponseEntity<Void> addBookedDate(
            @PathVariable Long id,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        vendorService.addBookedDate(id, date);

        return ResponseEntity.ok().build();
    }

    // =========================================================
    // REMOVE BOOKED DATE
    // =========================================================

    @DeleteMapping("/{id}/booked-dates")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove a booked date for a vendor")
    public ResponseEntity<Void> removeBookedDate(
            @PathVariable Long id,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        vendorService.removeBookedDate(id, date);

        return ResponseEntity.ok().build();
    }

    // =========================================================
    // GET VENDOR RATING
    // =========================================================

    @GetMapping("/{id}/rating")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get vendor rating")
    public ResponseEntity<Double> getVendorRating(@PathVariable Long id) {

        return ResponseEntity.ok(
                ratingService.calculateVendorRating(id));
    }

    // =========================================================
    // GET VENDOR RATING STATISTICS
    // =========================================================

    @GetMapping("/{id}/rating/stats")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get vendor rating statistics")
    public ResponseEntity<RatingStats> getVendorRatingStats(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                ratingService.getVendorRatingStats(id));
    }

    // =========================================================
    // GET VENDOR CONFLICTS
    // =========================================================

    @GetMapping("/{id}/conflicts")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get conflicts for a vendor on a date")
    public ResponseEntity<List<ConflictResolutionService.Conflict>> getConflicts(
            @PathVariable Long id,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        return ResponseEntity.ok(
                conflictService.getVendorConflicts(id, date));
    }

    // =========================================================
    // FIND ALTERNATIVE VENDORS
    // =========================================================

    @GetMapping("/alternatives")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Find alternative vendors for a category and date")
    public ResponseEntity<List<AlternativeVendor>> getAlternatives(
            @RequestParam String category,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            @RequestParam(required = false) Long excludeVendorId) {

        return ResponseEntity.ok(
                conflictService.suggestAlternatives(
                        category, date, excludeVendorId));
    }

    // =========================================================
    // FIND ALTERNATIVES FOR AN ASSIGNMENT
    // =========================================================

    @GetMapping("/assignments/{assignmentId}/alternatives")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Find alternative vendors for a declined assignment")
    public ResponseEntity<List<AlternativeVendor>> getAlternativesForAssignment(
            @PathVariable Long assignmentId) {

        return ResponseEntity.ok(
                conflictService.suggestAlternativesForAssignment(assignmentId));
    }

    // =========================================================
    // GET RESOLUTION SUGGESTION
    // =========================================================

    @GetMapping("/resolution-suggestion")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get comprehensive resolution suggestion for a vendor conflict")
    public ResponseEntity<ResolutionSuggestion> getResolutionSuggestion(
            @RequestParam Long vendorId,
            @RequestParam String category,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            @RequestParam(required = false) Long eventId) {

        return ResponseEntity.ok(
                conflictService.getResolutionSuggestion(
                        vendorId, category, date, eventId));
    }

    // =========================================================
    // RECALCULATE ALL VENDOR RATINGS
    // =========================================================

    @PostMapping("/recalculate-ratings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Recalculate ratings for all vendors")
    public ResponseEntity<Void> recalculateAllRatings() {

        ratingService.recalculateAllVendorRatings();

        return ResponseEntity.ok().build();
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private boolean hasRole(UserDetails principal, Role role) {

        if (principal == null) {
            return false;
        }

        return principal.getAuthorities().stream()
                .anyMatch(authority ->
                        authority.getAuthority().equals(
                                "ROLE_" + role.name()));
    }

    private boolean isVendorIdMatch(
            Long vendorId,
            UserDetails principal) {

        if (principal == null) {
            return false;
        }

        try {
            User user = userRepository
                    .findByUsername(principal.getUsername())
                    .orElse(null);

            if (user != null) {
                Vendor vendor = vendorService.getVendorByUser(
                        principal.getUsername());

                return vendor != null
                        && vendor.getId().equals(vendorId);
            }

        } catch (Exception e) {
            log.debug(
                    "Failed to resolve vendor for user: {}",
                    principal.getUsername());
        }

        return false;
    }
}
