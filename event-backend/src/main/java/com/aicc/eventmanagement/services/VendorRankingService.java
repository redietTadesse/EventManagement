package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
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
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The single ranking function for vendors.
 *
 * Two phases:
 *   GATES — binary eligibility. Failing a gate is not a low score; it is
 *           ineligibility. Unavailable vendors are excluded, not ranked last.
 *   SCORE — weighted ordering among eligible vendors:
 *               rating   50%   quality first
 *               load     40%   fairness — prevents one vendor absorbing everything
 *
 * Rating alone cannot override load: a 5-rated vendor with 10 active assignments
 * scores below a 4-rated vendor with 0.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VendorRankingService {

    private final VendorRepository vendorRepository;
    private final VendorBookedDateRepository bookedDateRepository;
    private final VendorAssignmentRepository assignmentRepository;

    private static final double W_RATING = 0.50;
    private static final double W_LOAD = 0.40;
    private static final int LOAD_CAP = 10;

    public record Ranked(Vendor vendor, double score) {}

    /**
     * Rank eligible vendors for a service category on a date.
     *
     * @param category     the service category being filled
     * @param date         the event date
     * @param alreadyTried vendor IDs already tried for this specific event/category
     * @return ranked list, best first. Empty if no vendor passes the gates.
     */
    public List<Ranked> rank(String category, LocalDate date, Set<Long> alreadyTried) {
        if (alreadyTried == null) alreadyTried = Set.of();

        // GATES
        final Set<Long> excluded = alreadyTried;
        List<Vendor> candidates = vendorRepository.findActiveByCategory(category).stream()
                .filter(v -> !excluded.contains(v.getId()))
                .filter(v -> !bookedDateRepository.existsByVendorIdAndBookedDate(v.getId(), date))
                .filter(v -> !assignmentRepository.hasActiveAssignmentOnDate(v.getId(), date))
                .toList();

        if (candidates.isEmpty()) {
            return List.of();
        }

        // SIGNALS
        List<Long> ids = candidates.stream().map(Vendor::getId).toList();

        Map<Long, Long> loads = assignmentRepository.countActiveAssignmentsByVendors(ids).stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));

        // SCORE
        List<Ranked> ranked = new ArrayList<>();
        for (Vendor v : candidates) {
            long load = loads.getOrDefault(v.getId(), 0L);
            ranked.add(new Ranked(v, score(v, load)));
        }

        // ORDER: score desc, rating desc, id asc for determinism
        ranked.sort(Comparator
                .comparingDouble(Ranked::score).reversed()
                .thenComparing(r -> r.vendor().getRating() == null ? 0 : r.vendor().getRating(),
                        Comparator.reverseOrder())
                .thenComparing(r -> r.vendor().getId()));
        return ranked;
    }

    /** Convenience: rank with the exclusion set derived from already-tried vendors. */
    public List<Ranked> rankForEvent(Long eventId, String category, LocalDate date) {
        Set<Long> tried = Set.copyOf(
                assignmentRepository.findTriedVendorIds(eventId, category));
        return rank(category, date, tried);
    }

    private double score(Vendor v, long load) {
        double rating = v.getRating() != null ? v.getRating() / 5.0 : 0.0;
        double loadScore = 1.0 - (double) Math.min(load, LOAD_CAP) / LOAD_CAP;
        return W_RATING * rating + W_LOAD * loadScore;
    }
}