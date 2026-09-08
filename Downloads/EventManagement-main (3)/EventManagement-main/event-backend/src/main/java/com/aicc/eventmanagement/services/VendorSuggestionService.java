package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VendorSuggestionService {

    private final VendorRepository vendorRepository;
    private final VendorBookedDateRepository bookedDateRepository;
    private final VendorAssignmentRepository assignmentRepository;

    /**
     * Get ranked suggestions for a vendor category on a given date.
     * Returns vendors sorted by suitability score (highest first).
     */
    public List<VendorSuggestion> getSuggestions(String category, LocalDate date, Long excludeVendorId, Long clientId) {
        // 1. Get all active vendors in this category
        List<Vendor> vendors = vendorRepository.findActiveByCategory(category);

        // 2. Filter out excluded vendor (e.g., one that already declined)
        if (excludeVendorId != null) {
            vendors = vendors.stream()
                    .filter(v -> !v.getId().equals(excludeVendorId))
                    .collect(Collectors.toList());
        }

        // 3. Filter to only available vendors (not booked and no active assignment on this date)
        List<Vendor> available = vendors.stream()
                .filter(v -> isVendorAvailable(v.getId(), date))
                .collect(Collectors.toList());

        if (available.isEmpty()) {
            log.info("No available vendors for category {} on date {}", category, date);
            return List.of();
        }

        // 4. Get active assignment counts for load balancing
        List<Long> vendorIds = available.stream()
                .map(Vendor::getId)
                .collect(Collectors.toList());
        Map<Long, Long> assignmentCounts = getActiveAssignmentCounts(vendorIds);

        // 5. Build suggestions with scores
        return available.stream()
                .map(v -> {
                    long activeCount = assignmentCounts.getOrDefault(v.getId(), 0L);
                    double score = calculateScore(v, activeCount, clientId);
                    boolean isRecommended = score >= 75.0;
                    return new VendorSuggestion(
                            v.getId(),
                            v.getCompanyName(),
                            v.getServiceCategory(),
                            v.getRating() != null ? v.getRating().doubleValue() : 0.0,
                            activeCount,
                            v.getPhone(),
                            v.getEmail(),
                            v.getDescription(),
                            score,
                            isRecommended,
                            getReasoning(v, activeCount, clientId)
                    );
                })
                .sorted(Comparator.comparingDouble(VendorSuggestion::score).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Check if a vendor is available on a given date.
     * A vendor is unavailable if they have a booked date or an active assignment on that date.
     */
    private boolean isVendorAvailable(Long vendorId, LocalDate date) {
        // Check 1: Booked date exists
        boolean hasBookedDate = bookedDateRepository.existsByVendorIdAndBookedDate(vendorId, date);
        if (hasBookedDate) {
            return false;
        }

        // Check 2: Has active assignment on this date
        boolean hasActiveAssignment = assignmentRepository.hasActiveAssignmentOnDate(vendorId, date);
        return !hasActiveAssignment;
    }

    /**
     * Get active assignment counts for a list of vendor IDs.
     */
    private Map<Long, Long> getActiveAssignmentCounts(List<Long> vendorIds) {
        if (vendorIds.isEmpty()) {
            return new HashMap<>();
        }
        List<Object[]> results = assignmentRepository.countActiveAssignmentsByVendors(vendorIds);
        return results.stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (Long) row[1]
                ));
    }

    /**
     * Calculate a score (0-100) for a vendor based on rating, load, and preferences.
     */
    private double calculateScore(Vendor vendor, long activeCount, Long clientId) {
        double ratingScore = 0;
        double loadScore = 0;
        double preferenceScore = 10.0; // base preference score

        // Rating: 0-5 scale mapped to 0-50 points
        if (vendor.getRating() != null) {
            ratingScore = (vendor.getRating().doubleValue() / 5.0) * 50.0;
        }

        // Load: fewer assignments → higher score (0-30 points)
        // 0 assignments = 30 points, 1 = 27, 2 = 24, ... 10+ = 0
        loadScore = Math.max(0, 30.0 - (activeCount * 3.0));

        // Total: rating (50) + load (30) + preference (10) = 90 max base
        // Scale to 0-100
        double rawScore = ratingScore + loadScore + preferenceScore;
        return Math.min(100, rawScore);
    }

    /**
     * Generate human-readable reasoning for why this vendor is suggested.
     */
    private String getReasoning(Vendor vendor, long activeCount, Long clientId) {
        List<String> reasons = new ArrayList<>();

        if (vendor.getRating() != null && vendor.getRating() >= 4.5) {
            reasons.add("Top rated vendor");
        } else if (vendor.getRating() != null && vendor.getRating() >= 4.0) {
            reasons.add("Highly rated");
        }

        if (activeCount == 0) {
            reasons.add("No current assignments");
        } else if (activeCount <= 2) {
            reasons.add("Low workload");
        } else {
            reasons.add("Moderate workload");
        }

        if (reasons.isEmpty()) {
            return "Good overall fit";
        }
        return String.join("; ", reasons);
    }

    /**
     * Get the single best match suggestion for a category and date.
     */
    public Optional<VendorSuggestion> getBestMatch(String category, LocalDate date, Long excludeVendorId, Long clientId) {
        List<VendorSuggestion> suggestions = getSuggestions(category, date, excludeVendorId, clientId);
        if (suggestions.isEmpty()) {
            return Optional.empty();
        }
        // Return the highest scored vendor
        return Optional.of(suggestions.get(0));
    }

    /**
     * Get detailed vendor profile with full details for the coordinator.
     */
    public VendorDetail getVendorDetail(Long vendorId, LocalDate eventDate) {
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + vendorId));

        List<VendorAssignment> assignments = assignmentRepository.findByVendorId(vendorId);

        long pastEvents = assignments.stream()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.COMPLETED)
                .count();

        long activeAssignments = assignments.stream()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.ACCEPTED)
                .count();

        boolean isAvailable = isVendorAvailable(vendorId, eventDate);

        // Get current active assignments for context
        List<VendorAssignmentSummary> currentAssignments = assignments.stream()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.ACCEPTED)
                .map(a -> new VendorAssignmentSummary(
                        a.getEvent().getId(),
                        a.getEvent().getName(),
                        a.getEvent().getInquiry().getEventDate()
                ))
                .collect(Collectors.toList());

        return new VendorDetail(
                vendor.getId(),
                vendor.getCompanyName(),
                vendor.getServiceCategory(),
                vendor.getRating() != null ? vendor.getRating().doubleValue() : 0.0,
                vendor.getPhone(),
                vendor.getEmail(),
                vendor.getDescription(),
                vendor.isActive(),
                pastEvents,
                activeAssignments,
                isAvailable,
                currentAssignments,
                vendor.getBookedDates().stream()
                        .map(bd -> bd.getBookedDate())
                        .collect(Collectors.toList())
        );
    }

    // ============ RECORDS (Inner Classes) ============

    public record VendorSuggestion(
            Long vendorId,
            String companyName,
            String serviceCategory,
            Double rating,
            long activeAssignments,
            String phone,
            String email,
            String notes,
            double score,
            boolean recommended,
            String reasoning
    ) {}

    public record VendorDetail(
            Long vendorId,
            String companyName,
            String serviceCategory,
            Double rating,
            String phone,
            String email,
            String description,
            boolean active,
            long pastEvents,
            long activeAssignments,
            boolean available,
            List<VendorAssignmentSummary> currentAssignments,
            List<LocalDate> bookedDates
    ) {}

    public record VendorAssignmentSummary(
            Long eventId,
            String eventName,
            LocalDate eventDate
    ) {}
}
