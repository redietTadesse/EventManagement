package com.aicc.eventmanagement.listeners;

import com.aicc.eventmanagement.entities.TransitionHistory;
import com.aicc.eventmanagement.events.WorkflowTransitionEvent;
import com.aicc.eventmanagement.repositories.TransitionHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class TransitionHistoryListener {

    private final TransitionHistoryRepository historyRepository;

    @EventListener
    @Transactional
    public void persistTransition(WorkflowTransitionEvent event) {
        try {
            String referenceId = event.getInquiryId();
            String referenceType = referenceId != null && referenceId.startsWith("EVENT-")
                    ? "EVENT"
                    : "INQUIRY";

            TransitionHistory history = TransitionHistory.builder()
                    .referenceId(referenceId)
                    .referenceType(referenceType)
                    .fromStatus(event.getFromStatus())
                    .toStatus(event.getToStatus())
                    .triggeredBy(event.getTriggeredBy())
                    .performedByUsername(resolveCurrentUsername())
                    .build();

            historyRepository.save(history);
        } catch (Exception e) {
            log.error("Failed to persist transition history: {}", e.getMessage());
        }
    }

    private String resolveCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "SYSTEM";
        }
        return auth.getName();
    }
}