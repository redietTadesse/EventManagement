package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VendorRatingService {

    private final VendorRepository vendorRepository;
    private final VendorAssignmentRepository assignmentRepository;

    // ============ RATING CALCULATION ============

    /** Calculate the rounded average of completed client reviews for one vendor. */
    public Double calculateVendorRating(Long vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new EntityNotFoundException("Vendor", vendorId));

        return calculateVendorRating(vendor);
    }

    public Double calculateVendorRating(Vendor vendor) {
        return calculateVendorRatings(List.of(vendor)).getOrDefault(vendor.getId(), 0.0);
    }

    /**
     * The client review average is the single rating source used across ranking,
     * suggestions, profiles and reporting. Vendors with no reviews are represented
     * as 0.0 rather than a fabricated default score.
     */
    public Map<Long, Double> calculateVendorRatings(List<Vendor> vendors) {
        if (vendors.isEmpty()) return Map.of();

        List<Long> vendorIds = vendors.stream().map(Vendor::getId).distinct().toList();
        Map<Long, Double> averages = assignmentRepository.averageCompletedRatingsByVendors(vendorIds)
                .stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> roundToOneDecimal(((Number) row[1]).doubleValue())
                ));

        return vendors.stream().collect(Collectors.toMap(
                Vendor::getId,
                vendor -> averages.getOrDefault(vendor.getId(), 0.0),
                (first, ignored) -> first
        ));
    }

    public static double roundToOneDecimal(double rating) {
        return Math.round(rating * 10.0) / 10.0;
    }

    // ============ UPDATE ALL VENDORS ============

    /**
     * Recalculate ratings for all vendors
     * Called by scheduled job or after event completion
     */
    public int recalculateAllVendorRatings() {
        List<Vendor> vendors = vendorRepository.findAll();
        log.info("Recalculating ratings for {} vendors", vendors.size());

        Map<Long, Double> ratings = calculateVendorRatings(vendors);
        for (Vendor vendor : vendors) {
            Double newRating = ratings.getOrDefault(vendor.getId(), 0.0);
            vendor.setRating(newRating);
            vendorRepository.save(vendor);
        }

        log.info("Rating recalculation complete");
        return vendors.size();
    }

    // ============ GET RATING BREAKDOWN ============

    public Map<Long, Double> getRatingsForVendors(List<Long> vendorIds) {
        List<Vendor> vendors = vendorRepository.findAllById(vendorIds);
        return calculateVendorRatings(vendors);
    }

    public RatingStats getVendorRatingStats(Long vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new EntityNotFoundException("Vendor", vendorId));

        List<VendorAssignment> completed = assignmentRepository
            .findByVendorIdAndStatus(vendorId, VendorAssignmentStatus.COMPLETED);

        List<Double> ratings = completed.stream()
            .map(VendorAssignment::getVendorRating)
            .filter(java.util.Objects::nonNull)
            .toList();

        if (ratings.isEmpty()) {
            return new RatingStats(0.0, 0, 0.0, 0.0);
        }

        double avg = ratings.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double min = ratings.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double max = ratings.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);

        return new RatingStats(
            roundToOneDecimal(avg),
            ratings.size(),
            min,
            max
        );
    }

    // ============ INNER CLASS ============

    public record RatingStats(
        double average,
        int totalRatings,
        double min,
        double max
    ) {}
}
