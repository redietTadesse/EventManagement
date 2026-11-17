package com.aicc.eventmanagement.services;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import java.time.Instant;

@Component @RequiredArgsConstructor @Slf4j
@ConditionalOnProperty(name = "app.followups.enabled", havingValue = "true", matchIfMissing = true)
public class BookingFollowupScheduler {
    private final InquiryRepository inquiries;
    private final BookingFollowupService followups;
    @Scheduled(initialDelayString = "${app.followups.scan-ms:60000}", fixedDelayString = "${app.followups.scan-ms:60000}")
    public void scan() {
        for (var inquiry : inquiries.findByStatus(EventStatus.PROPOSAL_ACCEPTED)) {
            try { followups.process(inquiry.getId(), Instant.now()); }
            catch (Exception exception) { log.error("Booking follow-up failed for inquiry {}", inquiry.getId(), exception); }
        }
    }
}
