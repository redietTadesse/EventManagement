package com.aicc.eventmanagement.events;

import lombok.Getter;
import com.aicc.eventmanagement.entities.VendorAssignment;
import org.springframework.context.ApplicationEvent;

/**
 * Event published when a VendorAssignment is created or updated.
 * Used by EmailNotificationListener to send notifications.
 */
@Getter
public class VendorAssignmentEvent extends ApplicationEvent {
    private final VendorAssignment assignment;

    public VendorAssignmentEvent(Object source, VendorAssignment assignment) {
        super(source);
        this.assignment = assignment;
    }
}
