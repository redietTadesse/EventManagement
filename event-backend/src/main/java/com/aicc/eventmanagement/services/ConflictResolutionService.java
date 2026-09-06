package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConflictResolutionService {

    private final VendorRepository vendorRepository;
    private final VendorAssignmentRepository assignmentRepository;
    private final VendorBookedDateRepository bookedDateRepository;
    private final VendorService vendorService;

    // ============ CONFLICT DETECTION ============

    /**
     * Check if a vendor has conflicts on a given date
     * Returns list of conflicting assignments
     */
    public List<Conflict> getVendorConflicts(Long vendorId, LocalDate date) {

        // Check booked dates
        boolean hasBookedDate = bookedDateRepository.existsByVendorIdAndBookedDate(vendorId, date);

        // Check active assignments on date
        boolean hasActiveAssignment = assignmentRepository.hasActiveAssignmentOnDate(vendorId, date);

        List<Conflict> conflicts = new ArrayList<>();

        if (hasBookedDate) {
            conflicts.add(new Conflict(
                ConflictType.BOOKED_DATE,
                "Vendor has a manually booked date on " + date,
                null
            ));
        }

        if (hasActiveAssignment) {
            // Find the conflicting assignment
            List<VendorAssignment> activeAssignments = assignmentRepository
                .findByVendorIdAndStatus(vendorId, VendorAssignmentStatus.ACCEPTED);

            for (VendorAssignment assignment : activeAssignments) {
                LocalDate assignmentDate = assignment.getEvent().getInquiry().getEventDate();
                if (assignmentDate.equals(date)) {
                    conflicts.add(new Conflict(
                        ConflictType.ACTIVE_ASSIGNMENT,
                        "Vendor is already assigned to " + assignment.getEvent().getName() +
                        " on " + date + " (" + assignment.getServiceCategory() + ")",
                        assignment
                    ));
                }
            }
        }

        return conflicts;
    }

    // ============ SUGGEST ALTERNATIVES ============

    /**
     * Find alternative vendors for a given category and date
     * Excludes the conflicted vendor
     */
    public List<AlternativeVendor> suggestAlternatives(
            String category,
            LocalDate date,
            Long excludedVendorId) {

        List<Vendor> available = vendorService.findAvailableVendors(category, date, excludedVendorId);

        if (available.isEmpty()) {
            return List.of();
        }

        // Get active assignment counts for load balancing
        List<Long> vendorIds = available.stream()
            .map(Vendor::getId)
            .collect(Collectors.toList());

        Map<Long, Long> assignmentCounts = assignmentRepository
            .countActiveAssignmentsByVendors(vendorIds).stream()
            .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        // Score and sort vendors
        return available.stream()
            .map(v -> {
                long activeCount = assignmentCounts.getOrDefault(v.getId(), 0L);
                double score = calculateVendorScore(v, activeCount);
                return new AlternativeVendor(
                    v.getId(),
                    v.getCompanyName(),
                    v.getServiceCategory(),
                    v.getRating() != null ? v.getRating().doubleValue() : 0.0,
                    activeCount,
                    score,
                    v.getPhone(),
                    v.getEmail()
                );
            })
            .sorted(Comparator.comparingDouble(AlternativeVendor::score).reversed())
            .collect(Collectors.toList());
    }

    /**
     * Suggest alternatives for a specific assignment that was declined
     */
    public List<AlternativeVendor> suggestAlternativesForAssignment(Long assignmentId) {
        VendorAssignment assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));

        LocalDate eventDate = assignment.getEvent().getInquiry().getEventDate();
        String category = assignment.getServiceCategory();
        Long declinedVendorId = assignment.getVendor().getId();

        return suggestAlternatives(category, eventDate, declinedVendorId);
    }

    /**
     * Find best alternative vendor for immediate reassignment
     */
    public AlternativeVendor findBestAlternative(String category, LocalDate date, Long excludedVendorId) {
        List<AlternativeVendor> alternatives = suggestAlternatives(category, date, excludedVendorId);

        if (alternatives.isEmpty()) {
            return null;
        }

        return alternatives.get(0);
    }

    // ============ SCORING ============

    private double calculateVendorScore(Vendor vendor, long activeCount) {
        double ratingScore = (vendor.getRating() != null ? vendor.getRating().doubleValue() : 0.0) / 5.0;
        double loadScore = Math.max(0, 1.0 - (activeCount / 10.0));

        // Weight: rating 60%, load 40%
        return (ratingScore * 0.6) + (loadScore * 0.4);
    }

    // ============ CONFLICT RESOLUTION SUGGESTIONS ============

    /**
     * Get comprehensive conflict resolution suggestions
     * Includes: conflicts found, alternatives, and next steps
     */
    public ResolutionSuggestion getResolutionSuggestion(
            Long vendorId,
            String category,
            LocalDate date,
            Long eventId) {

        List<Conflict> conflicts = getVendorConflicts(vendorId, date);
        List<AlternativeVendor> alternatives = suggestAlternatives(category, date, vendorId);

        // Determine next steps
        String suggestedAction;
        if (alternatives.isEmpty()) {
            suggestedAction = "No alternatives available. Coordinator must manually resolve.";
        } else if (alternatives.size() == 1) {
            suggestedAction = "Only one alternative available. Consider reassigning to " +
                alternatives.get(0).companyName();
        } else {
            suggestedAction = "Multiple alternatives available. Top choice: " +
                alternatives.get(0).companyName() +
                " (Score: " + String.format("%.2f", alternatives.get(0).score()) + ")";
        }

        return new ResolutionSuggestion(
            vendorId,
            conflicts,
            alternatives,
            suggestedAction,
            !alternatives.isEmpty()
        );
    }

    // ============ INNER CLASSES ============

    public record Conflict(
        ConflictType type,
        String description,
        VendorAssignment assignment
    ) {}

    public enum ConflictType {
        BOOKED_DATE,
        ACTIVE_ASSIGNMENT
    }

    public record AlternativeVendor(
        Long id,
        String companyName,
        String serviceCategory,
        Double rating,
        long activeAssignments,
        double score,
        String phone,
        String email
    ) {}

    public record ResolutionSuggestion(
        Long vendorId,
        List<Conflict> conflicts,
        List<AlternativeVendor> alternatives,
        String suggestedAction,
        boolean resolvable
    ) {}
}