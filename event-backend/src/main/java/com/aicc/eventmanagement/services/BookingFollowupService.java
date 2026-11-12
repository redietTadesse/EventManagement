package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.*;
import com.aicc.eventmanagement.entities.AppNotification.Destination;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.repositories.*;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.exceptions.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BookingFollowupService {
    private final InquiryRepository inquiries;
    private final BookingAgreementRepository agreements;
    private final BookingFollowupRepository followups;
    private final NotificationService notifications;
    private final AutomaticAssistance assistance;

    @Value("${app.followups.interval-hours:48}") private long intervalHours;
    @Value("${app.followups.reminder-limit:2}") private int reminderLimit;

    record Action(String label, Long recipient, Destination destination, String token) {}
    public record View(Long inquiryId, String clientName, String action, int reminders,
                       Instant startedAt, Instant firstSentAt, Instant lastSentAt,
                       Instant nextAt, Instant escalatedAt, boolean paused) {}

    Action action(Inquiry inquiry, BookingAgreement agreement) {
        if (agreement == null || inquiry.getStatus() != EventStatus.PROPOSAL_ACCEPTED
                || inquiry.getEvent() != null || agreement.getVerifiedAt() != null
                || inquiry.getEventDate().isBefore(LocalDate.now())) return null;
        String label;
        boolean staff = false;
        if (agreement.getClientSignedAt() == null) label = "Client signature";
        else if (agreement.getCoordinatorSignedAt() == null) { label = "Coordinator signature"; staff = true; }
        else if (agreement.getRejectionReason() != null) label = "Replacement receipt";
        else if (agreement.getReceiptUploadedAt() == null) label = "Payment receipt";
        else { label = "Receipt verification"; staff = true; }
        Long owner = inquiry.getCoordinator() == null ? null : inquiry.getCoordinator().getId();
        // A new contract, receipt, or owner starts a fresh follow-up cycle.
        String identity = label + "|" + owner + "|" + agreement.getTermsSnapshot() + "|"
                + agreement.getReceiptUploadedAt() + "|" + agreement.getRejectionReason();
        try {
            String token = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(identity.getBytes(StandardCharsets.UTF_8)));
            return new Action(label, staff ? owner : inquiry.getClientId(),
                    staff ? Destination.COORDINATOR_INQUIRY : Destination.CLIENT_INQUIRY, token);
        } catch (java.security.NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }

    private Duration interval() { return Duration.ofHours(Math.max(1, intervalHours)); }

    private BookingFollowup current(Long id, Action action, Instant now) {
        BookingFollowup state = followups.findById(id).orElseGet(BookingFollowup::new);
        if (!action.token().equals(state.getStageToken())) {
            state.setInquiryId(id);
            state.setStageToken(action.token());
            state.setStage(action.label());
            state.setStartedAt(now);
            state.setNextAt(now.plus(interval()));
            state.setFirstSentAt(null);
            state.setLastSentAt(null);
            state.setSentCount(0);
            state.setEscalatedAt(null);
        }
        return state;
    }

    @Transactional
    public void process(Long inquiryId, Instant now) {
        // The same inquiry lock is used by contract signatures, receipts, and ownership changes.
        Inquiry inquiry = inquiries.findForCoordinatorUpdate(inquiryId).orElse(null);
        if (inquiry == null) return;
        Action action = action(inquiry, agreements.findById(inquiryId).orElse(null));
        if (action == null) return;
        BookingFollowup state = current(inquiryId, action, now);
        followups.save(state);
        if (state.isPaused() || state.getEscalatedAt() != null || action.recipient() == null
                || now.isBefore(state.getNextAt())) return;
        if (state.getSentCount() < Math.max(1, reminderLimit)) {
            notifications.notifyUser(action.recipient(), action.destination(), inquiryId,
                    "Booking follow-up: " + action.label(),
                    "Inquiry #" + inquiryId + " for " + inquiry.getClientName()
                            + " is awaiting " + action.label().toLowerCase() + ". Open the inquiry to continue."
                            + ("Replacement receipt".equals(action.label()) ? " Correction requested: " + agreements.findById(inquiryId).orElseThrow().getRejectionReason() : ""));
            assistance.record(inquiry, null, "REMINDERS", "A booking reminder was queued",
                    action.label() + " · Reminder " + (state.getSentCount() + 1) + " for " + inquiry.getClientName() + ".", false);
            if (state.getFirstSentAt() == null) state.setFirstSentAt(now);
            state.setLastSentAt(now);
            state.setSentCount(state.getSentCount() + 1);
            state.setNextAt(now.plus(interval()));
        } else if (inquiry.getCoordinator() != null) {
            notifications.notifyUser(inquiry.getCoordinator().getId(), Destination.COORDINATOR_INQUIRY, inquiryId,
                    "Personal booking follow-up needed",
                    "Inquiry #" + inquiryId + " is still awaiting " + action.label().toLowerCase()
                            + " after " + state.getSentCount() + " reminders. Please contact the person responsible.");
            assistance.record(inquiry, null, "REMINDERS", "Personal follow-up was requested",
                    action.label() + " remains outstanding after " + state.getSentCount() + " reminders.", true);
            state.setEscalatedAt(now);
            state.setNextAt(null);
        }
        followups.save(state);
    }

    @Transactional(readOnly = true)
    public List<View> list(String username) {
        List<View> result = new ArrayList<>();
        for (Inquiry inquiry : inquiries.findByStatus(EventStatus.PROPOSAL_ACCEPTED)) {
            if (inquiry.getCoordinator() == null || !username.equals(inquiry.getCoordinator().getUsername())) continue;
            Action action = action(inquiry, agreements.findById(inquiry.getId()).orElse(null));
            if (action == null) continue;
            BookingFollowup state = followups.findById(inquiry.getId()).orElse(null);
            boolean current = state != null && action.token().equals(state.getStageToken());
            boolean paused = state != null && state.isPaused();
            result.add(new View(inquiry.getId(), inquiry.getClientName(), action.label(),
                    current ? state.getSentCount() : 0, current ? state.getStartedAt() : null,
                    current ? state.getFirstSentAt() : null, current ? state.getLastSentAt() : null,
                    current && !paused ? state.getNextAt() : null,
                    current ? state.getEscalatedAt() : null, paused));
        }
        return result;
    }

    @Transactional
    public void pause(Long id, String username, boolean paused) {
        Inquiry inquiry = inquiries.findForCoordinatorUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
        if (inquiry.getCoordinator() == null || !username.equals(inquiry.getCoordinator().getUsername()))
            throw new AccessDeniedException("Only the assigned coordinator can manage follow-ups.");
        Action action = action(inquiry, agreements.findById(id).orElse(null));
        if (action == null) throw new BusinessException("This inquiry has no outstanding booking action.", "INVALID_STATE");
        Instant now = Instant.now();
        BookingFollowup state = current(id, action, now);
        if (state.isPaused() && !paused && state.getEscalatedAt() == null) state.setNextAt(now.plus(interval()));
        state.setPaused(paused);
        followups.save(state);
    }
}
