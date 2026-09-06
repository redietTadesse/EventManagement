package com.aicc.eventmanagement.events;

import com.aicc.eventmanagement.entities.Inquiry;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class InquiryCreatedEvent extends ApplicationEvent {
    private final Inquiry inquiry;

    public InquiryCreatedEvent(Object source, Inquiry inquiry) {
        super(source);
        this.inquiry = inquiry;
    }
}