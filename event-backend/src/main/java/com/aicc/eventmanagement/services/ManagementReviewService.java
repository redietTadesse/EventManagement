
package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.*;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ManagementReviewService {
    private static final ZoneId ZONE = ZoneId.of("Africa/Addis_Ababa");
    private static final Set<EventStatus> CLOSED = Set.of(EventStatus.CANCELLED, EventStatus.CLOSED,
            EventStatus.COMPLETED, EventStatus.PROPOSAL_REJECTED);
    private final InquiryRepository inquiries;
    private final BookingAgreementRepository agreements;
    private final TransitionHistoryRepository history;

    public record Booking(Long inquiryId, Long eventId, String client, String type, LocalDate eventDate,
                          Long coordinatorId, String coordinator, String status, String nextAction,
                          String waitingOn, Long daysInStage, boolean review, String reviewReason,
                          boolean paidBooking, boolean createdEvent, boolean rejected, boolean cancelled) {}
    public record Coordinator(Long id, String name, long inquiries, long active, long paidBookings,
                              long waitingForCoordinator, long waitingForClient, long waitingForVendor,
                              long review, long unknownStageAge) {}
    public record Demand(String eventType, long inquiries, long paidBookings) {}
    public record Summary(LocalDate from, LocalDate through, int reviewDays, long previousInquiries,
                          List<Booking> bookings, List<Coordinator> coordinators, List<Demand> demand) {}

    @Transactional(readOnly = true)
    public Summary report(int days, int reviewDays) {
        LocalDate today = LocalDate.now(ZONE);
        LocalDate from = today.minusDays(days - 1L);
        List<Inquiry> received = inquiries.receivedForManagement(from.atStartOfDay(), today.plusDays(1).atStartOfDay());
        long previous = inquiries.receivedForManagement(from.minusDays(days).atStartOfDay(), from.atStartOfDay()).size();
        Map<Long, BookingAgreement> contracts = agreements.findAllById(received.stream().map(Inquiry::getId).toList())
                .stream().collect(Collectors.toMap(BookingAgreement::getInquiryId, agreement -> agreement));
        List<Booking> bookings = received.stream().map(inquiry -> booking(inquiry, contracts.get(inquiry.getId()),
                today, reviewDays)).sorted(Comparator.comparing(Booking::review).reversed()
                .thenComparing(Booking::daysInStage, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Booking::inquiryId)).toList();
        Map<String, List<Booking>> owners = bookings.stream().collect(Collectors.groupingBy(
                row -> row.coordinatorId() == null ? "UNASSIGNED" : row.coordinatorId().toString()));
        List<Coordinator> coordinators = owners.values().stream().map(rows -> {
            Booking owner = rows.get(0);
            List<Booking> active = rows.stream().filter(row -> !CLOSED.contains(EventStatus.valueOf(row.status()))).toList();
            return new Coordinator(owner.coordinatorId(), owner.coordinator(), rows.size(), active.size(),
                    rows.stream().filter(Booking::paidBooking).count(),
                    active.stream().filter(row -> row.waitingOn().equals("Coordinator")).count(),
                    active.stream().filter(row -> row.waitingOn().equals("Client")).count(),
                    active.stream().filter(row -> row.waitingOn().equals("Vendor")).count(),
                    rows.stream().filter(Booking::review).count(),
                    active.stream().filter(row -> row.daysInStage() == null).count());
        }).sorted(Comparator.comparingLong(Coordinator::review).reversed().thenComparing(Coordinator::name)).toList();
        List<Demand> demand = bookings.stream().collect(Collectors.groupingBy(Booking::type)).entrySet().stream()
                .map(entry -> new Demand(entry.getKey(), entry.getValue().size(),
                        entry.getValue().stream().filter(Booking::paidBooking).count()))
                .sorted(Comparator.comparingLong(Demand::inquiries).reversed().thenComparing(Demand::eventType)).toList();
        return new Summary(from, today, reviewDays, previous, bookings, coordinators, demand);
    }

    private Booking booking(Inquiry inquiry, BookingAgreement agreement, LocalDate today, int reviewDays) {
        Event event = inquiry.getEvent();
        EventStatus status = event == null ? inquiry.getStatus() : event.getStatus();
        String referenceType = event == null ? "INQUIRY" : "EVENT";
        String referenceId = event == null ? inquiry.getId().toString() : "EVENT-" + event.getId();
        LocalDateTime entered = history.findByReferenceTypeAndReferenceIdOrderByOccurredAtDesc(referenceType, referenceId)
                .stream().filter(change -> change.getToStatus() == status && change.getFromStatus() != status)
                .map(TransitionHistory::getOccurredAt).filter(Objects::nonNull).findFirst().orElse(null);
        if (entered == null && status == EventStatus.INQUIRY_SUBMITTED) entered = inquiry.getCreatedAt();
        if (entered == null && status == EventStatus.EVENT_CREATED && event != null) entered = event.getCreatedAt();
        Long age = entered == null ? null : Math.max(0, ChronoUnit.DAYS.between(entered.toLocalDate(), today));
        String waiting = "Coordinator";
        String action;
        switch (status) {
            case INQUIRY_SUBMITTED -> action = "Review requirements and prepare a proposal";
            case PROPOSAL_SENT -> { waiting = "Client"; action = "Client proposal decision"; }
            case PROPOSAL_ACCEPTED -> {
                if (agreement == null) action = "Review the booking agreement";
                else if (agreement.getClientSignedAt() == null) { waiting = "Client"; action = "Client signature"; }
                else if (agreement.getCoordinatorSignedAt() == null) action = "Coordinator signature";
                else if (agreement.getRejectionReason() != null) { waiting = "Client"; action = "Replacement receipt"; }
                else if (agreement.getReceiptUploadedAt() == null) { waiting = "Client"; action = "Payment receipt"; }
                else action = "Verify the uploaded receipt";
            }
            case AWAITING_VENDORS -> { waiting = "Vendor"; action = "Await vendor responses"; }
            case NEEDS_COORDINATOR -> action = "Resolve vendor sourcing: " +
                    (event == null || event.getUnfilledCategories() == null ? "review required services" : event.getUnfilledCategories());
            case CONFIRMED -> action = "Oversee event preparation";
            case EVENT_CREATED -> action = "Review venue and service commitments";
            default -> { waiting = "Closed"; action = "Review outcome and history"; }
        }
        boolean open = !CLOSED.contains(status);
        boolean stageWaiting = Set.of(EventStatus.INQUIRY_SUBMITTED, EventStatus.PROPOSAL_SENT,
                EventStatus.PROPOSAL_ACCEPTED, EventStatus.EVENT_CREATED, EventStatus.AWAITING_VENDORS).contains(status);
        boolean aged = stageWaiting && age != null && age >= reviewDays;
        LocalDate eventDate = inquiry.getEventDate();
        boolean past = open && eventDate.isBefore(today);
        boolean review = open && (inquiry.getCoordinator() == null || aged || past || status == EventStatus.NEEDS_COORDINATOR);
        String reason = inquiry.getCoordinator() == null && open ? "No coordinator assigned"
                : past ? "Event date has passed while the record remains open"
                : status == EventStatus.NEEDS_COORDINATOR ? "Vendor sourcing requires intervention"
                : aged ? "Current stage has lasted at least " + reviewDays + " days" : "";
        return new Booking(inquiry.getId(), event == null ? null : event.getId(), inquiry.getClientName(),
                inquiry.getEventType(), eventDate,
                inquiry.getCoordinator() == null ? null : inquiry.getCoordinator().getId(),
                inquiry.getCoordinator() == null ? "Unassigned" : inquiry.getCoordinator().getFullName() == null
                        ? inquiry.getCoordinator().getUsername() : inquiry.getCoordinator().getFullName(),
                status.name(), action, waiting, age, review, reason,
                agreement != null && agreement.getVerifiedAt() != null, event != null,
                inquiry.getStatus() == EventStatus.PROPOSAL_REJECTED, status == EventStatus.CANCELLED);
    }
}
