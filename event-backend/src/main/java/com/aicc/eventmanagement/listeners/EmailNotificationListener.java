package com.aicc.eventmanagement.listeners;

import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.events.EventCreatedEvent;
import com.aicc.eventmanagement.events.InquiryCreatedEvent;
import com.aicc.eventmanagement.events.InquiryStatusChangedEvent;
import com.aicc.eventmanagement.events.VendorAssignmentEvent;
import com.aicc.eventmanagement.services.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for workflow events and sends email notifications.
 * All listeners are decoupled from core business logic via Spring events.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationListener {

    private final EmailService emailService;

    /**
     * 1. New Inquiry Created → Notify Coordinator
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleInquiryCreated(InquiryCreatedEvent event) {
        Inquiry inquiry = event.getInquiry();
        log.info("📧 [Email] New inquiry {} — notifying coordinator", inquiry.getId());

        String coordinatorEmail = "coordinator@aicc.et";
        emailService.sendNewInquiryNotification(inquiry, coordinatorEmail);
    }

    /**
     * 2. Proposal Sent → Notify Client
     * 3. Proposal Accepted → Notify Coordinator
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleInquiryStatusChanged(InquiryStatusChangedEvent event) {
        Inquiry inquiry = event.getInquiry();
        EventStatus newStatus = event.getNewStatus();

        if (newStatus == EventStatus.PROPOSAL_SENT) {
            log.info("📧 [Email] Proposal sent for inquiry {} — notifying client", inquiry.getId());
            String clientEmail = "client@example.com";
            emailService.sendProposalNotification(inquiry, clientEmail);

        } else if (newStatus == EventStatus.PROPOSAL_ACCEPTED) {
            log.info("📧 [Email] Proposal accepted for inquiry {} — notifying coordinator", inquiry.getId());
            String coordinatorEmail = "coordinator@aicc.et";
            emailService.sendProposalAcceptedNotification(inquiry, coordinatorEmail);
        }
    }

    /**
     * 4. Vendor Assignment Created → Notify Vendor
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleVendorAssignmentCreated(VendorAssignmentEvent event) {
        VendorAssignment assignment = event.getAssignment();
        log.info("📧 [Email] Assignment {} created — notifying vendor {}", assignment.getId(), assignment.getVendorName());

        emailService.sendVendorAssignmentNotification(assignment);
    }

    /**
     * 5 & 6. Vendor Responded (Accepted/Declined) → Notify Coordinator
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleVendorAssignmentResponse(VendorAssignmentEvent event) {
        VendorAssignment assignment = event.getAssignment();

        // Only notify on response (not on creation)
        if (assignment.getStatus() != null && assignment.getRespondedAt() != null) {
            log.info("📧 [Email] Vendor {} responded to assignment {} — notifying coordinator",
                    assignment.getVendorName(), assignment.getId());

            emailService.sendVendorResponseNotification(assignment);
        }
    }
}
