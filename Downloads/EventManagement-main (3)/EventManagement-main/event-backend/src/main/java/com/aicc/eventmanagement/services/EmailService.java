package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.*;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
     * 2. Proposal Sent → Client gets notified (HTML with direct action links)
     */
    public void sendProposalNotification(Inquiry inquiry, String clientEmail) {
        String subject = "📝 Your Event Proposal is Ready – AICC";

        // Parse proposal details from JSON
        String venue = "TBD";
        Integer price = 0;
        String terms = "";
        try {
            if (inquiry.getProposal() != null) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                java.util.Map<String, Object> proposalMap = mapper.readValue(inquiry.getProposal(),
                        new com.fasterxml.jackson.core.type.TypeReference<>() {});
                venue = (String) proposalMap.getOrDefault("venue", "TBD");
                price = proposalMap.get("price") != null ? ((Number) proposalMap.get("price")).intValue() : 0;
                terms = (String) proposalMap.getOrDefault("terms", "");
            }
        } catch (Exception e) {
            log.warn("Could not parse proposal JSON for email", e);
        }

        String htmlBody = String.format("""
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="margin: 0;">AICC Event Management</h1>
                    </div>
                    
                    <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
                        <h2 style="color: #1f2937; margin-top: 0;">Your Event Proposal is Ready</h2>
                        
                        <p>Dear <strong>%s</strong>,</p>
                        
                        <p>We are pleased to present your proposal for the <strong>%s</strong> event at AICC.</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #4f46e5;">📋 Proposal Summary</h3>
                            <p><strong>Event:</strong> %s</p>
                            <p><strong>Date:</strong> %s</p>
                            <p><strong>Venue:</strong> %s</p>
                            <p><strong>Price:</strong> ETB %,d</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="%s/client/proposals/%d/accept" 
                               style="display: inline-block; padding: 14px 32px; margin: 5px; border-radius: 8px; font-weight: bold; text-decoration: none; background: #22c55e; color: white;">
                                ✅ Accept Proposal
                            </a>
                            <a href="%s/client/proposals/%d/reject" 
                               style="display: inline-block; padding: 14px 32px; margin: 5px; border-radius: 8px; font-weight: bold; text-decoration: none; background: #ef4444; color: white;">
                                ❌ Decline
                            </a>
                        </div>
                        
                        <p style="text-align: center;">
                            <a href="%s/client/inquiries/%d" style="color: #4f46e5;">View full details →</a>
                        </p>
                        
                        <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 20px;">
                            <p style="margin: 0; font-size: 14px;"><strong>Terms:</strong> %s</p>
                        </div>
                    </div>
                    
                    <div style="background: #1f2937; color: #9ca3af; padding: 15px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px;">
                        <p style="margin: 0;">AICC Event Management Team</p>
                        <p style="margin: 5px 0 0 0;">Addis International Convention Center</p>
                    </div>
                </body>
                </html>
                """,
                inquiry.getClientName(),
                inquiry.getEventType(),
                inquiry.getEventType(),
                inquiry.getEventDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                venue,
                price,
                baseUrl, inquiry.getId(),
                baseUrl, inquiry.getId(),
                baseUrl, inquiry.getId(),
                terms
        );

        sendHtmlEmail(clientEmail, subject, htmlBody);
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

    // ============ HTML EMAIL SUPPORT ============

    /**
     * Send an HTML email with rich formatting.
     * Falls back to plain text if HTML sending fails.
     */
    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        if (to == null || to.isEmpty()) {
            log.warn("No email address provided. Skipping HTML email: {}", subject);
            return;
        }

        String actualRecipient = (recipientOverride != null && !recipientOverride.isEmpty())
                ? recipientOverride : to;

        String logEntry = String.format("TO: %s | SUBJECT: %s | TYPE: HTML", actualRecipient, subject);
        emailLog.add(logEntry);
        log.info("📧 {}", logEntry);

        if (!emailEnabled) {
            log.info("Email disabled. Would have sent HTML: {}", subject);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(actualRecipient);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = isHtml

            mailSender.send(message);
            log.info("HTML email sent successfully to: {}", actualRecipient);

        } catch (MessagingException e) {
            log.error("Failed to create HTML email to {}: {}", actualRecipient, e.getMessage());
            // Fallback to plain text
            sendEmail(to, subject, "Please view this email in an HTML-capable client.");
        } catch (MailException e) {
            log.error("Failed to send HTML email to {}: {}", actualRecipient, e.getMessage());
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
