package com.aicc.eventmanagement.listeners;

import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.NotificationType;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.events.InquiryCreatedEvent;
import com.aicc.eventmanagement.events.InquiryStatusChangedEvent;
import com.aicc.eventmanagement.events.ProposalChangeRequestedEvent;
import com.aicc.eventmanagement.events.VendorAssignmentEvent;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.services.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Persists in-app notifications from the same domain events the email listener consumes.
 * Runs synchronously inside the publishing transaction (plain @EventListener), so lazy
 * associations such as assignment.getVendor() and assignment.getEvent() resolve while the
 * session is open, and a notification is written only if the triggering action commits.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /** Inquiry submitted -> every active coordinator. */
    @EventListener
    public void onInquiryCreated(InquiryCreatedEvent event) {
        Inquiry inquiry = event.getInquiry();
        notifyCoordinators(
                NotificationType.INQUIRY_SUBMITTED,
                "New inquiry",
                inquiry.getClientName() + " submitted a " + inquiry.getEventType() + " inquiry",
                inquiry.getId());
    }

    /** Proposal sent -> client; proposal accepted -> coordinators; event completed -> client. */
    @EventListener
    public void onInquiryStatusChanged(InquiryStatusChangedEvent event) {
        Inquiry inquiry = event.getInquiry();
        EventStatus status = event.getNewStatus();
        Long inquiryId = inquiry.getId();

        switch (status) {
            case PROPOSAL_SENT -> notificationService.create(
                    inquiry.getClientId(), NotificationType.PROPOSAL_SENT,
                    "Proposal received",
                    "A proposal is ready for your " + inquiry.getEventType() + " event",
                    inquiryId);

            case PROPOSAL_ACCEPTED -> notifyCoordinators(
                    NotificationType.PROPOSAL_ACCEPTED,
                    "Proposal accepted",
                    inquiry.getClientName() + " accepted the proposal",
                    inquiryId);

            case COMPLETED -> notificationService.create(
                    inquiry.getClientId(), NotificationType.EVENT_COMPLETED,
                    "Event completed",
                    "Your " + inquiry.getEventType() + " event has been marked completed",
                    inquiryId);

            default -> { /* other transitions carry no notification */ }
        }
    }

    /** Client requested a proposal change -> coordinators. */
    @EventListener
    public void onProposalChangeRequested(ProposalChangeRequestedEvent event) {
        Inquiry inquiry = event.getInquiry();
        notifyCoordinators(
                NotificationType.PROPOSAL_CHANGE_REQUESTED,
                "Change requested",
                inquiry.getClientName() + " requested changes to the proposal",
                inquiry.getId());
    }

    /** Assignment offered -> that vendor; vendor accepted/declined -> coordinators. */
    @EventListener
    public void onVendorAssignment(VendorAssignmentEvent event) {
        VendorAssignment a = event.getAssignment();
        VendorAssignmentStatus status = a.getStatus();
        if (status == null) {
            return;
        }

        switch (status) {
            case PENDING -> {
                Long vendorUserId = vendorUserId(a.getVendor());
                if (vendorUserId != null) {
                    notificationService.create(
                            vendorUserId, NotificationType.VENDOR_ASSIGNMENT_OFFERED,
                            "New assignment offer",
                            "You have a " + a.getServiceCategory() + " assignment to review",
                            a.getId());
                }
            }
            case ACCEPTED -> notifyCoordinators(
                    NotificationType.VENDOR_ACCEPTED,
                    "Vendor accepted",
                    a.getVendorName() + " accepted the " + a.getServiceCategory() + " assignment",
                    a.getEvent().getId());

            case DECLINED -> notifyCoordinators(
                    NotificationType.VENDOR_DECLINED,
                    "Vendor declined",
                    a.getVendorName() + " declined the " + a.getServiceCategory() + " assignment",
                    a.getEvent().getId());

            default -> { /* OPEN, EXPIRED, COMPLETED, CANCELLED: no personal notification */ }
        }
    }

    private void notifyCoordinators(NotificationType type, String title, String message, Long referenceId) {
        for (User coordinator : userRepository.findByRoleAndIsActiveTrue(Role.COORDINATOR)) {
            notificationService.create(coordinator.getId(), type, title, message, referenceId);
        }
    }

    private Long vendorUserId(Vendor vendor) {
        return vendor != null ? vendor.getUserId() : null;
    }
}