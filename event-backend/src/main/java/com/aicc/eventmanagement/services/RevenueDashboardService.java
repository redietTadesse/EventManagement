package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.repositories.BookingAgreementRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RevenueDashboardService {
    private static final ZoneId REPORT_ZONE = ZoneId.of("Africa/Addis_Ababa");
    private final BookingAgreementRepository agreements;
    private final ObjectMapper json;

    public record Amount(long totalEtb, long contracts) {
        Amount add(long etb) { return new Amount(totalEtb + etb, contracts + 1); }
    }
    public record Month(String month, long totalEtb, long contracts) {}
    public record Segment(String label, long totalEtb, long contracts) {}
    public record Summary(String fromMonth, String throughMonth, Amount verified,
                          Amount awaitingReceipt, Amount awaitingReview, List<Month> monthly,
                          List<Segment> byVenue, List<Segment> byEventType) {}

    @Transactional(readOnly = true)
    public Summary summarize(int months) {
        Instant now = Instant.now();
        LocalDate today = now.atZone(REPORT_ZONE).toLocalDate();
        YearMonth current = YearMonth.from(today);
        YearMonth first = current.minusMonths(months - 1L);
        Instant from = first.atDay(1).atStartOfDay(REPORT_ZONE).toInstant();

        Amount verified = new Amount(0, 0);
        Amount awaitingReceipt = new Amount(0, 0);
        Amount awaitingReview = new Amount(0, 0);
        Map<YearMonth, Amount> trend = new LinkedHashMap<>();
        Map<String, Amount> venues = new LinkedHashMap<>();
        Map<String, Amount> eventTypes = new LinkedHashMap<>();
        for (int i = 0; i < months; i++) trend.put(first.plusMonths(i), new Amount(0, 0));

        for (var payment : agreements.findVerifiedForReport(from, now)) {
            var terms = readTerms(payment.getTermsSnapshot());
            long total = terms.totalEtb();
            YearMonth month = YearMonth.from(payment.getVerifiedAt().atZone(REPORT_ZONE));
            verified = verified.add(total);
            trend.computeIfPresent(month, (key, amount) -> amount.add(total));
            add(venues, terms.venue(), total);
            add(eventTypes, terms.eventType(), total);
        }

        for (var contract : agreements.findOutstandingForReport(today,
                com.aicc.eventmanagement.enums.EventStatus.PROPOSAL_ACCEPTED)) {
            long total = readTerms(contract.getTermsSnapshot()).totalEtb();
            if (contract.getReceiptUploadedAt() != null && contract.getRejectionReason() == null) {
                awaitingReview = awaitingReview.add(total);
            } else {
                awaitingReceipt = awaitingReceipt.add(total);
            }
        }

        return new Summary(first.toString(), current.toString(), verified, awaitingReceipt, awaitingReview,
                trend.entrySet().stream().map(entry -> new Month(entry.getKey().toString(),
                        entry.getValue().totalEtb(), entry.getValue().contracts())).toList(),
                segments(venues), segments(eventTypes));
    }

    private BookingAgreementService.Terms readTerms(String snapshot) {
        try {
            return json.readValue(snapshot, BookingAgreementService.Terms.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not read a booking agreement for the revenue report", e);
        }
    }

    private static void add(Map<String, Amount> segments, String key, long total) {
        segments.merge(key, new Amount(total, 1),
                (existing, next) -> existing.add(next.totalEtb()));
    }

    private static List<Segment> segments(Map<String, Amount> amounts) {
        return amounts.entrySet().stream()
                .map(entry -> new Segment(entry.getKey(), entry.getValue().totalEtb(), entry.getValue().contracts()))
                .sorted(Comparator.comparingLong(Segment::totalEtb).reversed().thenComparing(Segment::label))
                .toList();
    }
}
