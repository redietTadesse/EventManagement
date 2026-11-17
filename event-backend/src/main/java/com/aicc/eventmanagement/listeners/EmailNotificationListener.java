package com.aicc.eventmanagement.listeners;

import com.aicc.eventmanagement.entities.AppNotification.Destination;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.events.*;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.services.EmailService;
import com.aicc.eventmanagement.services.BookingAgreementService;
import com.aicc.eventmanagement.services.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class EmailNotificationListener {
    private final EmailService emailService;
    private final NotificationService notifications;
    private final BookingAgreementService bookingAgreements;
    private final EventRepository events;
    private final UserRepository users;

    @EventListener
    public void onNewInquiry(InquiryCreatedEvent event) {
        Inquiry inquiry = event.getInquiry();
        for (User coordinator : users.findByRoleOrderByUsernameAsc(Role.COORDINATOR)) {
            notifications.notifyUser(coordinator.getId(), Destination.COORDINATOR_INQUIRY, inquiry.getId(),
                    "New event inquiry", "Inquiry #" + inquiry.getId() + " is ready for coordinator review.");
        }
    }

    @EventListener
    public void onInquiryStatus(InquiryStatusChangedEvent event) {
        Inquiry inquiry = event.getInquiry();
        switch (event.getNewStatus()) {
            case PROPOSAL_SENT -> notifications.notifyUser(inquiry.getClientId(), Destination.CLIENT_INQUIRY,
                    inquiry.getId(), event.getOldStatus() == EventStatus.PROPOSAL_SENT ? "Proposal updated" : "Your event proposal is ready",
                    "Open inquiry #" + inquiry.getId() + " to review the venue, quote, and terms.");
            case PROPOSAL_ACCEPTED -> {
                bookingAgreements.prepareForAcceptedProposal(inquiry);
                notifyCoordinator(inquiry, "Client accepted the proposal",
                        "Open inquiry #" + inquiry.getId() + " to review the booking agreement.");
            }
            case PROPOSAL_REJECTED -> notifyCoordinator(inquiry, "Client declined the proposal",
                    "Open inquiry #" + inquiry.getId() + " to review the outcome.");
            default -> { }
        }
    }

    @EventListener
    public void onChangesRequested(ProposalChangeRequestedEvent event) {
        notifyCoordinator(event.getInquiry(), "Client requested proposal changes",
                "Open the inquiry to read the client's feedback.");
    }

    @EventListener
    public void onVendorAssignment(VendorAssignmentEvent event) {
        var assignment = event.getAssignment();
        var booking = assignment.getEvent();
        if (booking == null || assignment.getVendor() == null) return;
        var status = assignment.getStatus();
        if (status == VendorAssignmentStatus.PENDING && assignment.getRespondedAt() == null) {
            notifications.notifyUser(assignment.getVendor().getUserId(), Destination.VENDOR_ASSIGNMENT,
                    assignment.getId(), "New vendor offer",
                    "Review the " + assignment.getServiceCategory() + " offer for " + booking.getName() + ".");
        } else if ((status == VendorAssignmentStatus.ACCEPTED || status == VendorAssignmentStatus.DECLINED)
                && assignment.getRespondedAt() != null && booking.getInquiry() != null
                && booking.getInquiry().getCoordinator() != null) {
            notifications.notifyUser(booking.getInquiry().getCoordinator().getId(), Destination.COORDINATOR_EVENT,
                    booking.getId(), status == VendorAssignmentStatus.ACCEPTED ? "Vendor accepted an offer" : "Vendor declined an offer",
                    assignment.getVendorName() + " responded to the " + assignment.getServiceCategory() + " offer for " + booking.getName() + ".");
        }
    }

    @EventListener
    public void onEventStatus(WorkflowTransitionEvent transition) {
        String reference = transition.getInquiryId();
        EventStatus status = transition.getToStatus();
        if (reference == null || !reference.matches("EVENT-[0-9]+") || transition.getFromStatus() == status) return;
        String title = switch (status) {
            case CONFIRMED -> "Your event is confirmed";
            case CANCELLED -> "Your event was cancelled";
            case COMPLETED -> "Your event is complete";
            default -> null;
        };
        if (title == null) return;
        events.findById(Long.parseLong(reference.substring(6))).ifPresent(event -> {
            if (event.getInquiry() != null) {
                notifications.notifyUser(event.getInquiry().getClientId(), Destination.CLIENT_EVENT,
                        event.getId(), title, "Open " + event.getName() + " to see the latest event details.");
            }
        });
    }

    private void notifyCoordinator(Inquiry inquiry, String title, String message) {
        if (inquiry.getCoordinator() != null) {
            notifications.notifyUser(inquiry.getCoordinator().getId(), Destination.COORDINATOR_INQUIRY,
                    inquiry.getId(), title, message);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void deliverEmail(NotificationService.EmailRequested message) {
        emailService.sendWorkflowNotification(message);
    }
}
