package com.aicc.eventmanagement.events;

import com.aicc.eventmanagement.entities.Inquiry;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ProposalChangeRequestedEvent extends ApplicationEvent {
    private final Inquiry inquiry;

    public ProposalChangeRequestedEvent(Object source, Inquiry inquiry) {
        super(source);
        this.inquiry = inquiry;
    }
}
