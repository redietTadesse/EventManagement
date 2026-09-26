package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
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
    private final VendorAssignmentRepository assignmentRepository;
    private final VendorRankingService rankingService;

    /**
     * Get ranked suggestions for a vendor category on a given date.
     * Returns vendors sorted by suitability score (highest first).
     */
    public List<VendorSuggestion> getSuggestions(String category, LocalDate date, Long excludeVendorId, Long clientId) {
        Set<Long> excluded = excludeVendorId == null ? Set.of() : Set.of(excludeVendorId);
        List<VendorRankingService.Ranked> ranked = rankingService.rank(category, date, excluded);
        if (ranked.isEmpty()) {
            log.info("No available vendors for category {} on date {}", category, date);
            return List.of();
        }

        return ranked.stream()
            .map(result -> {
                Vendor v = result.vendor();
                long activeCount = assignmentRepository.countActiveAndPendingByVendor(v.getId());
                double score = result.score() * 100.0;
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
                            getReasoning(v, activeCount)
                    );
                })
                .sorted(Comparator.comparingDouble(VendorSuggestion::score).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Check if a vendor is available on a given date.
     * A vendor is unavailable if they have a booked date or an active assignment on that date.
     */
    

    /**
     * Generate human-readable reasoning for why this vendor is suggested.
     */
    private String getReasoning(Vendor vendor, long activeCount) {
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

        boolean isAvailable = rankingService.rank(vendor.getServiceCategory(), eventDate, Set.of()).stream()
            .anyMatch(result -> result.vendor().getId().equals(vendorId));

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
