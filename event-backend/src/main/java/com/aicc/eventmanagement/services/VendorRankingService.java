package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.enums.SelectionReason;
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
import java.util.Optional;
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

    /**
     * The weights are normalized by their own sum so a score lands in [0, 1].
     *
     * Previously the raw sum of 0.90 was returned, so a flawless vendor scored 0.9
     * and never 1.0. Dividing by the weight total is strictly monotonic, so vendor
     * ORDERING is unchanged and no assignment decision differs. Only the number the
     * coordinator sees changes, and it now means what it looks like it means.
     */
    private static final double W_TOTAL = W_RATING + W_LOAD;

    private static final int LOAD_CAP = 10;
    private static final double RATING_SCALE = 5.0;

    /**
     * One scored candidate. ratingTerm and loadTerm are the weighted contributions
     * that produced the score; they are kept so the selection reason can be explained
     * from the same numbers rather than guessed at afterwards.
     */
    public record Ranked(Vendor vendor, double score, double ratingTerm, double loadTerm) {}

    /** The winning candidate plus the explanation recorded alongside it. */
    public record Selection(Vendor vendor, double score, SelectionReason reason) {}

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
                        .filter(v -> v.getInsuranceExpiryDate() == null
                                || !v.getInsuranceExpiryDate().isBefore(date))
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

        List<Ranked> ranked = new ArrayList<>();

        for (Vendor vendor : candidates) {
            long load = loads.getOrDefault(vendor.getId(), 0L);
            double ratingTerm = ratingTerm(vendor);
            double loadTerm = loadTerm(load);
            double score = (ratingTerm + loadTerm) / W_TOTAL;
            ranked.add(new Ranked(vendor, score, ratingTerm, loadTerm));
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

    /**
     * Rank and return the winner together with its score and the reason it won.
     *
     * Callers use this instead of rank().get(0) so the score and reason are captured
     * in the same breath as the decision, which is the only moment they are knowable.
     */
    public Optional<Selection> select(
            String category,
            LocalDate date,
            Set<Long> alreadyTried) {

        List<Ranked> ranked = rank(category, date, alreadyTried);

        if (ranked.isEmpty()) {
            return Optional.empty();
        }

        boolean isReassignment = alreadyTried != null && !alreadyTried.isEmpty();
        Ranked winner = ranked.get(0);

        return Optional.of(new Selection(
                winner.vendor(),
                winner.score(),
                explain(ranked, isReassignment)
        ));
    }

    public Optional<Selection> selectForEvent(
            Long eventId,
            String category,
            LocalDate date) {

        Set<Long> tried = Set.copyOf(
                assignmentRepository.findTriedVendorIds(eventId, category)
        );

        return select(category, date, tried);
    }

    /**
     * Explain the winner by comparing it to the runner-up on the two score components.
     *
     * Whichever component gave the winner its margin is the reason it won. This is
     * derived from the same numbers that produced the ranking, so the stored reason
     * and the stored score can never contradict each other.
     */
    SelectionReason explain(List<Ranked> ranked, boolean isReassignment) {

        if (ranked.size() == 1) {
            return isReassignment
                    ? SelectionReason.ROTATION_REFRESHED
                    : SelectionReason.ONLY_CANDIDATE;
        }

        Ranked winner = ranked.get(0);
        Ranked runnerUp = ranked.get(1);

        double ratingEdge = winner.ratingTerm() - runnerUp.ratingTerm();
        double loadEdge = winner.loadTerm() - runnerUp.loadTerm();

        // Equal on both components: the sort fell through to the vendor-id tie-break.
        if (ratingEdge == 0.0 && loadEdge == 0.0) {
            return SelectionReason.TIE_BREAK;
        }

        return loadEdge > ratingEdge
                ? SelectionReason.LEAST_LOADED
                : SelectionReason.TOP_RATED;
    }

    private double ratingTerm(Vendor vendor) {
        double normalized = vendor.getRating() != null
                ? vendor.getRating() / RATING_SCALE
                : 0.0;
        return W_RATING * normalized;
    }

    private double loadTerm(long load) {
        return W_LOAD * (1.0 - (double) Math.min(load, LOAD_CAP) / LOAD_CAP);
    }
}