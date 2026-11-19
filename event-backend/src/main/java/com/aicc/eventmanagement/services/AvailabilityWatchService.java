package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.*;
import com.aicc.eventmanagement.entities.AppNotification.Destination;
import com.aicc.eventmanagement.enums.*;
import com.aicc.eventmanagement.exceptions.*;
import com.aicc.eventmanagement.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.List;

@Service @RequiredArgsConstructor
public class AvailabilityWatchService {
    private final AvailabilityWatchRepository watches;
    private final InquiryRepository inquiries;
    private final UserRepository users;
    private final BookingOptionsService options;
    private final NotificationService notifications;
    public record View(String status, Instant createdAt, Instant notifiedAt, Long matchedVenueId, String matchedVenueName) {}

    @Transactional
    public View get(Long id, String username) { return view(watches.findByInquiryId(owned(id, username).getId()).orElse(null)); }

    @Transactional
    public View subscribe(Long id, String username) {
        Inquiry inquiry = owned(id, username);
        if (closed(inquiry)) throw new BusinessException("Only an active inquiry for a future event can join the waiting list.", "INQUIRY_CLOSED");
        var existing = watches.findByInquiryId(id).orElse(null);
        if (existing != null && existing.getStatus() == AvailabilityWatch.Status.WAITING) return view(existing);
        if (!matches(inquiry).isEmpty()) throw new BusinessException("Suitable venues are available now. Check venues or contact your coordinator instead of joining the waiting list.", "VENUES_ALREADY_AVAILABLE");
        var watch = existing == null ? new AvailabilityWatch() : existing;
        watch.setInquiryId(id); watch.setClientId(inquiry.getClientId()); watch.setStatus(AvailabilityWatch.Status.WAITING);
        watch.setCreatedAt(Instant.now()); watch.setNextCheckAt(Instant.now()); watch.setNotifiedAt(null);
        watch.setMatchedVenueId(null); watch.setMatchedVenueName(null);
        return view(watches.save(watch));
    }

    @Transactional
    public View cancel(Long id, String username) {
        owned(id, username);
        var watch = watches.findByInquiryId(id).orElse(null);
        if (watch != null) { watch.setStatus(AvailabilityWatch.Status.CANCELLED); watches.save(watch); }
        return view(watch);
    }

    @Transactional
    public void process(Long watchId, Instant now) {
        Long inquiryId = watches.inquiryIdForWatch(watchId).orElse(null);
        if (inquiryId == null) return;
        // Inquiry first, as in subscription and booking, to serialize conversion,
        // cancellation and matching without competing for locks in reverse order.
        var inquiry = inquiries.findForCoordinatorUpdate(inquiryId).orElse(null);
        var watch = watches.findForUpdate(watchId).orElse(null);
        if (watch == null || watch.getStatus() != AvailabilityWatch.Status.WAITING) return;
        var client = users.findById(watch.getClientId()).orElse(null);
        if (inquiry == null || closed(inquiry) || client == null || !client.isActive()) {
            watch.setStatus(AvailabilityWatch.Status.CLOSED); return;
        }
        watch.setNextCheckAt(now.plusSeconds(60));
        List<BookingOptionsService.Option> choices = matches(inquiry);
        if (choices.isEmpty()) return;
        var match = choices.get(0);
        watch.setStatus(AvailabilityWatch.Status.NOTIFIED); watch.setNotifiedAt(now);
        watch.setMatchedVenueId(match.venueId()); watch.setMatchedVenueName(match.venueName());
        String message = match.venueName() + " currently fits " + inquiry.getExpectedAttendees() + " attendees for "
                + inquiry.getEventDate() + " through " + (inquiry.getEndDate() == null ? inquiry.getEventDate() : inquiry.getEndDate())
                + ". The required venue window is " + match.bookedFrom() + " through " + match.bookedThrough()
                + ". This notice does not reserve the space; contact your coordinator to agree the proposal and recheck availability.";
        notifications.notifyUser(watch.getClientId(), Destination.CLIENT_INQUIRY, inquiry.getId(), "A suitable venue became available", message);
        if (inquiry.getCoordinator() != null) notifications.notifyUser(inquiry.getCoordinator().getId(),
                Destination.COORDINATOR_INQUIRY, inquiry.getId(), "A waiting-list inquiry has a venue option", message);
    }

    private List<BookingOptionsService.Option> matches(Inquiry inquiry) {
        return options.search(new BookingOptionsService.Request(inquiry.getEventDate(), inquiry.getEndDate(),
                inquiry.getExpectedAttendees(), inquiry.getEventType(), inquiry.getTableSetup() == null ? "UNDECIDED" : inquiry.getTableSetup(), 0, null)).options();
    }
    private boolean closed(Inquiry inquiry) {
        return inquiry.getEvent() != null || !inquiry.getEventDate().isAfter(LocalDate.now())
                || List.of(EventStatus.EVENT_CREATED, EventStatus.CANCELLED, EventStatus.CLOSED, EventStatus.COMPLETED, EventStatus.PROPOSAL_REJECTED).contains(inquiry.getStatus());
    }
    private Inquiry owned(Long id, String username) {
        var user = users.findByUsername(username).orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
        var inquiry = inquiries.findForCoordinatorUpdate(id).orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
        if (user.getRole() != Role.CLIENT || !user.getId().equals(inquiry.getClientId())) throw new EntityNotFoundException("Inquiry", id);
        return inquiry;
    }
    private View view(AvailabilityWatch watch) {
        return watch == null ? new View("NOT_SUBSCRIBED", null, null, null, null)
                : new View(watch.getStatus().name(), watch.getCreatedAt(), watch.getNotifiedAt(), watch.getMatchedVenueId(), watch.getMatchedVenueName());
    }
}
