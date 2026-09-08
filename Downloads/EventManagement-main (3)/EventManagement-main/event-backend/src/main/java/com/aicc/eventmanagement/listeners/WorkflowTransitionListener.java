package com.aicc.eventmanagement.listeners;

import com.aicc.eventmanagement.events.WorkflowTransitionEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class WorkflowTransitionListener {

    private static final Logger log = LoggerFactory.getLogger(WorkflowTransitionListener.class);

    @EventListener
    public void handleWorkflowTransition(WorkflowTransitionEvent event) {
        log.info("TRANSITION SUCCESSFUL: {} -> {} for Inquiry {} triggered by {}",
                event.getFromStatus(),
                event.getToStatus(),
                event.getInquiryId(),
                event.getTriggeredBy()
        );
    }
}