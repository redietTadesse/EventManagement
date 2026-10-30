package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.enums.SelectionReason;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
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
    private final VendorRatingService ratingService;

    private static final double W_RATING = 0.50;
    private static final double W_LOAD = 0.40;
    private static final double W_ROTATION = 0.10;

    /**
     * Quality, current workload, and assignment rotation contribute 50%, 40%, and
     * 10% respectively. Each component is normalized to [0, 1], so the total score
     * also stays in [0, 1].
     */
    private static final double W_TOTAL = W_RATING + W_LOAD + W_ROTATION;

    private static final int LOAD_CAP = 10;
    private static final double RATING_SCALE = 5.0;

    /**
     * Weighted score contributions and their normalized component scores. Keeping
     * the component values here lets the API explain the same ranking it returns.
     */
    public record Ranked(Vendor vendor, double score, double ratingTerm, double loadTerm, double rotationTerm) {
        public double qualityScore() { return ratingTerm / W_RATING; }
        public double workloadScore() { return loadTerm / W_LOAD; }
        public double rotationScore() { return rotationTerm / W_ROTATION; }
        public double rating() { return qualityScore() * RATING_SCALE; }
    }

    /** The winning candidate plus the decision snapshot captured at selection time. */
    public record Selection(Vendor vendor, double score, SelectionReason reason, String reasoning) {}

    private record RankResult(List<Ranked> ranked, List<Map<String, Object>> excluded) {}

    private static final ObjectMapper SNAPSHOT_MAPPER = new ObjectMapper();

    public List<Ranked> rank(
            String category,
            LocalDate date,
            Set<Long> alreadyTried) {

        return evaluate(category, date, alreadyTried).ranked();
    }

    private RankResult evaluate(String category, LocalDate date, Set<Long> alreadyTried) {

        if (alreadyTried == null) {
            alreadyTried = Set.of();
        }

        final Set<Long> excluded = alreadyTried;

        List<Vendor> candidates = new ArrayList<>();
        List<Map<String, Object>> excludedVendors = new ArrayList<>();
        for (Vendor vendor : vendorRepository.findByServiceCategory(category)) {
            String exclusionReason = getExclusionReason(vendor, date, excluded);
            if (exclusionReason == null) {
                candidates.add(vendor);
            } else {
                excludedVendors.add(excludedCandidate(vendor, exclusionReason));
            }
        }

        if (candidates.isEmpty()) {
            return new RankResult(List.of(), excludedVendors);
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

        Map<Long, Long> assignmentHistory = assignmentRepository.countAllAssignmentsByVendors(ids)
                .stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (Long) row[1]
                ));

        Map<Long, Double> ratings = ratingService.calculateVendorRatings(candidates);

        List<Ranked> ranked = new ArrayList<>();

        for (Vendor vendor : candidates) {
            long load = loads.getOrDefault(vendor.getId(), 0L);
            double ratingTerm = ratingTerm(ratings.getOrDefault(vendor.getId(), 0.0));
            double loadTerm = loadTerm(load);
            double rotationTerm = rotationTerm(assignmentHistory.getOrDefault(vendor.getId(), 0L));
            double score = (ratingTerm + loadTerm + rotationTerm) / W_TOTAL;
            ranked.add(new Ranked(vendor, score, ratingTerm, loadTerm, rotationTerm));
        }

        // Highest score first; vendor ID provides a stable tie-breaker.
        ranked.sort(
                Comparator.comparingDouble(Ranked::score)
                        .reversed()
                        .thenComparing(r -> r.vendor().getId())
        );

        return new RankResult(ranked, excludedVendors);
    }

    private String getExclusionReason(Vendor vendor, LocalDate date, Set<Long> alreadyTried) {
        if (!vendor.isActive()) return "Vendor is inactive";
        if (alreadyTried.contains(vendor.getId())) return "Already tried for this event";
        if (vendor.getInsuranceExpiryDate() == null) {
            return "Insurance expiry date is not on file";
        }
        if (vendor.getInsuranceExpiryDate().isBefore(date)) {
            return "Insurance expires before the event date";
        }
        if (bookedDateRepository.existsByVendorIdAndBookedDate(vendor.getId(), date)) {
            return "Vendor has a booked date on the event date";
        }
        if (assignmentRepository.hasActiveAssignmentOnDate(vendor.getId(), date)) {
            return "Vendor has a conflicting assignment on the event date";
        }
        return null;
    }

    private Map<String, Object> excludedCandidate(Vendor vendor, String reason) {
        Map<String, Object> candidate = new LinkedHashMap<>();
        candidate.put("vendorId", vendor.getId());
        candidate.put("vendorName", vendor.getCompanyName());
        candidate.put("score", null);
        candidate.put("status", "Unavailable");
        candidate.put("reason", reason);
        return candidate;
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

        RankResult result = evaluate(category, date, alreadyTried);
        List<Ranked> ranked = result.ranked();

        if (ranked.isEmpty()) {
            return Optional.empty();
        }

        boolean isReassignment = alreadyTried != null && !alreadyTried.isEmpty();
        Ranked winner = ranked.get(0);

        SelectionReason reason = explain(ranked, isReassignment);
        String reasoning = buildDecisionSnapshot(category, date, ranked, result.excluded(), reason);

        return Optional.of(new Selection(winner.vendor(), winner.score(), reason, reasoning));
    }

    private String buildDecisionSnapshot(String category, LocalDate date, List<Ranked> ranked,
                                         List<Map<String, Object>> excluded, SelectionReason reason) {
        Ranked winner = ranked.get(0);
        List<Map<String, Object>> considered = new ArrayList<>();
        for (int index = 0; index < ranked.size(); index++) {
            Ranked candidate = ranked.get(index);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("vendorId", candidate.vendor().getId());
            entry.put("vendorName", candidate.vendor().getCompanyName());
            entry.put("score", Math.round(candidate.score() * 1000.0) / 10.0);
            entry.put("normalizedScore", candidate.score());
            entry.put("qualityContribution", Math.round(candidate.ratingTerm() / W_TOTAL * 1000.0) / 10.0);
            entry.put("workloadContribution", Math.round(candidate.loadTerm() / W_TOTAL * 1000.0) / 10.0);
            entry.put("rotationContribution", Math.round(candidate.rotationTerm() / W_TOTAL * 1000.0) / 10.0);
            entry.put("qualityScore", Math.round(candidate.qualityScore() * 1000.0) / 10.0);
            entry.put("workloadScore", Math.round(candidate.workloadScore() * 1000.0) / 10.0);
            entry.put("rotationScore", Math.round(candidate.rotationScore() * 1000.0) / 10.0);
            entry.put("rank", index + 1);
            entry.put("status", index == 0 ? "Selected" : "Ranked");
            considered.add(entry);
        }

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("category", category);
        snapshot.put("eventDate", date == null ? null : date.toString());
        snapshot.put("selectedVendorId", winner.vendor().getId());
        snapshot.put("selectedVendorName", winner.vendor().getCompanyName());
        snapshot.put("selectionReason", reason.name());
        snapshot.put("reasoning", reason.getLabel());
        snapshot.put("considered", considered);
        snapshot.put("excluded", excluded);

        try {
            return SNAPSHOT_MAPPER.writeValueAsString(snapshot);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize vendor decision snapshot", e);
        }
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
     * Explain the winner by comparing it to the runner-up on all three score components.
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
        double rotationEdge = winner.rotationTerm() - runnerUp.rotationTerm();

        // Equal on every component: the sort fell through to the vendor-id tie-break.
        if (ratingEdge == 0.0 && loadEdge == 0.0 && rotationEdge == 0.0) {
            return SelectionReason.TIE_BREAK;
        }

        if (rotationEdge > ratingEdge && rotationEdge > loadEdge) {
            return SelectionReason.ROTATION_REFRESHED;
        }
        return loadEdge > ratingEdge ? SelectionReason.LEAST_LOADED : SelectionReason.TOP_RATED;
    }

    private double ratingTerm(double rating) {
        double normalized = rating / RATING_SCALE;
        return W_RATING * normalized;
    }

    private double loadTerm(long load) {
        return W_LOAD * (1.0 - (double) Math.min(load, LOAD_CAP) / LOAD_CAP);
    }

    private double rotationTerm(long historicalAssignments) {
        return W_ROTATION * (1.0 - (double) Math.min(historicalAssignments, LOAD_CAP) / LOAD_CAP);
    }
}
