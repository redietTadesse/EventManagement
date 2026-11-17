
package com.aicc.eventmanagement.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmailServiceTest {
    private JavaMailSender sender;
    private EmailService service;

    @BeforeEach
    void setup() {
        sender = mock(JavaMailSender.class);
        service = new EmailService(sender);
        ReflectionTestUtils.setField(service, "emailEnabled", true);
        ReflectionTestUtils.setField(service, "fromEmail", "sender@example.test");
        ReflectionTestUtils.setField(service, "frontendUrl", "https://events.example.test/");
        ReflectionTestUtils.setField(service, "recipientOverride", "");
    }

    private void send() {
        service.sendWorkflowNotification(new NotificationService.EmailRequested(
                "client@example.test", "Proposal ready", "Review your proposal.", "/client/inquiries/7"));
    }

    @Test
    void submitsTheWorkflowToTheIntendedRecipientWithAWorkingFrontendLink() {
        send();
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(message.capture());
        assertThat(message.getValue().getTo()).containsExactly("client@example.test");
        assertThat(message.getValue().getText()).contains("https://events.example.test/client/inquiries/7");
        assertThat(service.getEmailLog()).anyMatch(line -> line.contains("ACCEPTED_BY_MAIL_SERVER"));
    }

    @Test
    void authenticationFailureIsVisibleAndNeverReportedAsSent() {
        doThrow(new MailAuthenticationException("sensitive server response")).when(sender).send(any(SimpleMailMessage.class));
        send();
        assertThat(service.getEmailLog()).anyMatch(line -> line.contains("FAILED_AUTHENTICATION"))
                .noneMatch(line -> line.contains("ACCEPTED_BY_MAIL_SERVER") || line.contains("sensitive server response"));
    }

    @Test
    void networkFailureIsVisibleAndDisabledDeliveryNeverCallsTheMailServer() {
        doThrow(new MailSendException("unreachable")).when(sender).send(any(SimpleMailMessage.class));
        send();
        assertThat(service.getEmailLog()).anyMatch(line -> line.contains("FAILED_DELIVERY"));
        reset(sender);
        service.clearEmailLog();
        ReflectionTestUtils.setField(service, "emailEnabled", false);
        send();
        verifyNoInteractions(sender);
        assertThat(service.getEmailLog()).anyMatch(line -> line.contains("DISABLED"))
                .noneMatch(line -> line.contains("ACCEPTED_BY_MAIL_SERVER"));
    }
}
