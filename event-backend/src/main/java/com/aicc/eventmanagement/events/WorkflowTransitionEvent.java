package com.aicc.eventmanagement.events;

import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import org.springframework.context.ApplicationEvent;

public class WorkflowTransitionEvent extends ApplicationEvent {
    private final EventStatus fromStatus;
    private final EventStatus toStatus;
    private final String inquiryId;
    private final Role triggeredBy;

    public WorkflowTransitionEvent(Object source, EventStatus fromStatus, EventStatus toStatus,
                                   String inquiryId, Role triggeredBy) {
        super(source);
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.inquiryId = inquiryId;
        this.triggeredBy = triggeredBy;
    }

    public EventStatus getFromStatus() { return fromStatus; }
    public EventStatus getToStatus() { return toStatus; }
    public String getInquiryId() { return inquiryId; }
    public Role getTriggeredBy() { return triggeredBy; }
}