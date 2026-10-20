
package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VendorRankingService {

    private final VendorRepository vendorRepository;
    private final VendorBookedDateRepository bookedDateRepository;
    private final VendorAssignmentRepository assignmentRepository;

    private static final double W_RATING = 0.50;
    private static final double W_LOAD = 0.40;
    private static final int LOAD_CAP = 10;

    public record Ranked(Vendor vendor, double score) {}

    public List<Ranked> rank(
            String category,
            LocalDate date,
            Set<Long> alreadyTried) {

        if (alreadyTried == null) {
            alreadyTried = Set.of();
        }

        final Set<Long> excluded = alreadyTried;

        // Exclude vendors who are inactive, already tried, or unavailable.
        List<Vendor> candidates =
                vendorRepository.findActiveByCategory(category).stream()
                        .filter(v -> !excluded.contains(v.getId()))
                        .filter(v -> !bookedDateRepository
                                .existsByVendorIdAndBookedDate(v.getId(), date))
                        .filter(v -> !assignmentRepository
                                .hasActiveAssignmentOnDate(v.getId(), date))
                        .toList();

        if (candidates.isEmpty()) {
            return List.of();
        }

        // Get workload counts for all candidates in one query.
        List<Long> ids = candidates.stream()
                .map(Vendor::getId)
                .toList();

        Map<Long, Long> loads =
                assignmentRepository.countActiveAssignmentsByVendors(ids)
                        .stream()
                        .collect(Collectors.toMap(
                                row -> (Long) row[0],
                                row -> (Long) row[1]
                        ));

        // Score vendors based on rating and workload.
        List<Ranked> ranked = new ArrayList<>();

        for (Vendor vendor : candidates) {
            long load = loads.getOrDefault(vendor.getId(), 0L);
            ranked.add(new Ranked(vendor, score(vendor, load)));
        }

        // Highest score first; vendor ID provides a stable tie-breaker.
        ranked.sort(
                Comparator.comparingDouble(Ranked::score)
                        .reversed()
                        .thenComparing(r -> r.vendor().getId())
        );

        return ranked;
    }

    public List<Ranked> rankForEvent(
            Long eventId,
            String category,
            LocalDate date) {

        Set<Long> tried = Set.copyOf(
                assignmentRepository.findTriedVendorIds(eventId, category)
        );

        return rank(category, date, tried);
    }

    private double score(Vendor vendor, long load) {
        double rating = vendor.getRating() != null
                ? vendor.getRating() / 5.0
                : 0.0;

        double loadScore =
                1.0 - (double) Math.min(load, LOAD_CAP) / LOAD_CAP;

        return W_RATING * rating + W_LOAD * loadScore;
    }
}
