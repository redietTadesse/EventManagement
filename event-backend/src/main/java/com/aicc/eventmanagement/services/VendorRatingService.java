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

    /**
     * Calculate rating for a single vendor based on completed assignments
     * Rating = average rating from all COMPLETED assignments
     * If no completed assignments, rating stays as-is or defaults to 0
     */
    public Double calculateVendorRating(Long vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new EntityNotFoundException("Vendor", vendorId));

        return calculateVendorRating(vendor);
    }

    public Double calculateVendorRating(Vendor vendor) {
        List<VendorAssignment> completed = assignmentRepository
            .findByVendorIdAndStatus(vendor.getId(), VendorAssignmentStatus.COMPLETED);

        if (completed.isEmpty()) {
            return vendor.getRating() != null ? vendor.getRating().doubleValue() : 0.0;
        }

        // Sum all ratings from completed assignments
        double total = completed.stream()
            .mapToDouble(a -> a.getVendorRating() != null ? a.getVendorRating() : 0.0)
            .sum();

        double average = total / completed.size();
        return Math.round(average * 10) / 10.0; // Round to 1 decimal place
    }

    // ============ UPDATE ALL VENDORS ============

    /**
     * Recalculate ratings for all vendors
     * Called by scheduled job or after event completion
     */
    public void recalculateAllVendorRatings() {
        List<Vendor> vendors = vendorRepository.findAll();
        log.info("Recalculating ratings for {} vendors", vendors.size());

        for (Vendor vendor : vendors) {
            Double newRating = calculateVendorRating(vendor);
            vendor.setRating((int) Math.round(newRating)); // Vendor.rating is Integer (1-5)
            vendorRepository.save(vendor);
        }

        log.info("Rating recalculation complete");
    }

    // ============ GET RATING BREAKDOWN ============

    public Map<Long, Double> getRatingsForVendors(List<Long> vendorIds) {
        List<Vendor> vendors = vendorRepository.findAllById(vendorIds);
        return vendors.stream()
            .collect(Collectors.toMap(
                Vendor::getId,
                this::calculateVendorRating
            ));
    }

    public RatingStats getVendorRatingStats(Long vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new EntityNotFoundException("Vendor", vendorId));

        List<VendorAssignment> completed = assignmentRepository
            .findByVendorIdAndStatus(vendorId, VendorAssignmentStatus.COMPLETED);

        if (completed.isEmpty()) {
            return new RatingStats(0.0, 0, 0.0, 0.0);
        }

        List<Double> ratings = completed.stream()
            .map(a -> a.getVendorRating() != null ? a.getVendorRating() : 0.0)
            .collect(Collectors.toList());

        double avg = ratings.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double min = ratings.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double max = ratings.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);

        return new RatingStats(
            Math.round(avg * 10) / 10.0,
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