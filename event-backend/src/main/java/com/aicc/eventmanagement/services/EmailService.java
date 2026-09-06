package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from:noreply@aicc.et}")
    private String fromEmail;

    @Value("${app.email.enabled:true}")
    private boolean emailEnabled;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${app.email.recipient-override:}")
    private String recipientOverride;

    /**
     * Store of sent emails for testing/demo purposes.
     * In production, this would not exist — emails would be sent directly.
     */
    private final List<String> emailLog = Collections.synchronizedList(new ArrayList<>());

    // ============ NOTIFICATION TEMPLATES ============

    /**
     * 1. New Inquiry → Coordinator gets notified
     */
    public void sendNewInquiryNotification(Inquiry inquiry, String coordinatorEmail) {
        String subject = "📋 New Event Inquiry: " + inquiry.getEventType();

        String body = String.format("""
                Hello Coordinator,

                A new event inquiry has been submitted.

                ─────────────────────────────────────
                Event Type: %s
                Client: %s
                Date: %s
                Expected Attendees: %d
                Requirements: %s
                ─────────────────────────────────────

                View inquiry: %s/coordinator/inquiries/%d

                AICC Event Management System
                """,
                inquiry.getEventType(),
                inquiry.getClientName(),
                inquiry.getEventDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                inquiry.getExpectedAttendees(),
                inquiry.getRequirements() != null ? inquiry.getRequirements() : "None specified",
                baseUrl,
                inquiry.getId()
        );

        sendEmail(coordinatorEmail, subject, body);
    }

    /**
     * 2. Proposal Sent → Client gets notified
     */
    public void sendProposalNotification(Inquiry inquiry, String clientEmail) {
        String subject = "📝 Your Event Proposal is Ready";

        String body = String.format("""
                Hello %s,

                Your proposal for the %s event is ready for review.

                ─────────────────────────────────────
                Event Type: %s
                Date: %s
                Expected Attendees: %d
                ─────────────────────────────────────

                Please login to view and respond to the proposal:
                %s/client/inquiries/%d

                Best regards,
                AICC Event Management Team
                """,
                inquiry.getClientName(),
                inquiry.getEventType(),
                inquiry.getEventType(),
                inquiry.getEventDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                inquiry.getExpectedAttendees(),
                baseUrl,
                inquiry.getId()
        );

        sendEmail(clientEmail, subject, body);
    }

    /**
     * 3. Proposal Accepted → Coordinator gets notified
     */
    public void sendProposalAcceptedNotification(Inquiry inquiry, String coordinatorEmail) {
        String subject = "✅ Proposal Accepted: " + inquiry.getEventType();

        String body = String.format("""
                Hello Coordinator,

                The client has accepted the proposal for the %s event.

                ─────────────────────────────────────
                Client: %s
                Date: %s
                Expected Attendees: %d
                ─────────────────────────────────────

                Proceed to create the event:
                %s/coordinator/inquiries/%d

                AICC Event Management System
                """,
                inquiry.getEventType(),
                inquiry.getClientName(),
                inquiry.getEventDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                inquiry.getExpectedAttendees(),
                baseUrl,
                inquiry.getId()
        );

        sendEmail(coordinatorEmail, subject, body);
    }

    /**
     * 4. Event Created → Vendors get assignment notifications
     */
    public void sendVendorAssignmentNotification(VendorAssignment assignment) {
        Vendor vendor = assignment.getVendor();
        Event event = assignment.getEvent();

        String subject = "🔔 New Assignment: " + event.getName();

        String body = String.format("""
                Hello %s,

                You have been assigned to provide %s services for the following event:

                ─────────────────────────────────────
                Event: %s
                Service: %s
                Date: %s
                Client: %s
                Expected Attendees: %d
                ─────────────────────────────────────

                Please login to accept or decline this assignment:
                %s/vendor/assignments/%d

                If you have any questions, please contact the AICC coordination team.

                Best regards,
                AICC Event Management
                """,
                assignment.getVendorName(),
                assignment.getServiceCategory().replace("_", " ").toUpperCase(),
                event.getName(),
                event.getInquiry().getEventDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                event.getInquiry().getClientName(),
                event.getInquiry().getExpectedAttendees(),
                baseUrl,
                assignment.getId()
        );

        sendEmail(vendor.getEmail(), subject, body);
    }

    /**
     * 5 & 6. Assignment Accepted/Declined → Coordinator gets notified
     */
    public void sendVendorResponseNotification(VendorAssignment assignment) {
        Event event = assignment.getEvent();
        String coordinatorEmail = "coordinator@aicc.et";

        boolean accepted = assignment.getStatus().name().equals("ACCEPTED");
        String status = accepted ? "Accepted" : "Declined";
        String icon = accepted ? "✅" : "❌";

        String subject = String.format("%s Vendor %s Assignment: %s", icon, status, event.getName());

        String body = String.format("""
                Hello Coordinator,

                Vendor %s has %s the assignment for:

                ─────────────────────────────────────
                Event: %s
                Service: %s
                %s
                ─────────────────────────────────────

                View assignment details:
                %s/coordinator/assignments/%d

                AICC Event Management System
                """,
                assignment.getVendorName(),
                status.toLowerCase(),
                event.getName(),
                assignment.getServiceCategory().replace("_", " "),
                assignment.getDeclineReason() != null ?
                        "Decline Reason: " + assignment.getDeclineReason() : "",
                baseUrl,
                assignment.getId()
        );

        sendEmail(coordinatorEmail, subject, body);
    }

    /**
     * 7. Pending Assignment Reminder → Vendor gets reminder
     */
    public void sendPendingAssignmentReminder(VendorAssignment assignment) {
        Vendor vendor = assignment.getVendor();

        String subject = "⏰ REMINDER: Assignment Pending Response";

        String body = String.format("""
                Hello %s,

                This is a friendly reminder that you have a pending assignment requiring your response:

                ─────────────────────────────────────
                Event: %s
                Service: %s
                Date: %s
                ─────────────────────────────────────

                Please respond as soon as possible:
                %s/vendor/assignments/%d

                AICC Event Management
                """,
                assignment.getVendorName(),
                assignment.getEvent().getName(),
                assignment.getServiceCategory().replace("_", " "),
                assignment.getEvent().getInquiry().getEventDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                baseUrl,
                assignment.getId()
        );

        sendEmail(vendor.getEmail(), subject, body);
    }

    /**
     * 8. Event Confirmed → Client & Vendors get notified
     */
    public void sendEventConfirmedNotification(Event event) {
        Inquiry inquiry = event.getInquiry();

        String subject = "🎉 Your Event is Confirmed: " + event.getName();

        String body = String.format("""
                Hello %s,

                We are pleased to confirm your event at AICC!

                ─────────────────────────────────────
                Event: %s
                Date: %s
                Venue: %s
                Expected Attendees: %d
                ─────────────────────────────────────

                All vendors have been confirmed. You will receive a final checklist closer to the event date.

                Login to view event details:
                %s/client/events/%d

                Best regards,
                AICC Event Management Team
                """,
                inquiry.getClientName(),
                event.getName(),
                inquiry.getEventDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                event.getVenue() != null ? event.getVenue() : "TBD",
                inquiry.getExpectedAttendees(),
                baseUrl,
                event.getId()
        );

        // In production, send to client's actual email
        sendEmail("client@example.com", subject, body);
    }

    /**
     * 9. Event Completed → Client gets feedback request
     */
    public void sendEventCompletedNotification(Event event) {
        Inquiry inquiry = event.getInquiry();

        String subject = "⭐ Event Completed: How Did We Do?";

        String body = String.format("""
                Hello %s,

                We hope your event at AICC was a great success!

                ─────────────────────────────────────
                Event: %s
                Date: %s
                ─────────────────────────────────────

                We would appreciate your feedback on the vendors who provided services.
                Please take a moment to rate your experience:

                %s/client/events/%d

                Thank you for choosing AICC. We look forward to hosting your future events!

                Best regards,
                AICC Event Management Team
                """,
                inquiry.getClientName(),
                event.getName(),
                inquiry.getEventDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                baseUrl,
                event.getId()
        );

        sendEmail("client@example.com", subject, body);
    }

    // ============ CORE SEND METHOD ============

    /**
     * Send an email. If email is disabled, logs it for demo purposes.
     * If recipientOverride is set, sends to that address instead (for testing).
     */
    private void sendEmail(String to, String subject, String body) {
        if (to == null || to.isEmpty()) {
            log.warn("No email address provided. Skipping email: {}", subject);
            return;
        }

        // For testing: override recipient if configured
        String actualRecipient = (recipientOverride != null && !recipientOverride.isEmpty())
                ? recipientOverride : to;

        // Log the email regardless
        String logEntry = String.format("TO: %s | SUBJECT: %s", actualRecipient, subject);
        emailLog.add(logEntry);
        log.info("📧 {}", logEntry);

        if (!emailEnabled) {
            log.info("Email disabled. Would have sent: {}", subject);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(actualRecipient);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            log.info("Email sent successfully to: {}", actualRecipient);

        } catch (MailException e) {
            log.error("Failed to send email to {}: {}", actualRecipient, e.getMessage());
        }
    }

    // ============ TESTING / DEMO SUPPORT ============

    /**
     * Get the email log for testing/demo purposes.
     */
    public List<String> getEmailLog() {
        return List.copyOf(emailLog);
    }

    /**
     * Clear the email log.
     */
    public void clearEmailLog() {
        emailLog.clear();
    }

    /**
     * Check if email is enabled.
     */
    public boolean isEmailEnabled() {
        return emailEnabled;
    }
}
