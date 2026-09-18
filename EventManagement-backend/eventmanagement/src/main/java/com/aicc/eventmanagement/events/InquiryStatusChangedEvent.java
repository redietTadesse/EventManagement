package com.aicc.eventmanagement.events;

import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class InquiryStatusChangedEvent extends ApplicationEvent {
    private final Inquiry inquiry;
    private final EventStatus oldStatus;
    private final EventStatus newStatus;

    public InquiryStatusChangedEvent(Object source, Inquiry inquiry, EventStatus oldStatus, EventStatus newStatus) {
        super(source);
        this.inquiry = inquiry;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
    }
}