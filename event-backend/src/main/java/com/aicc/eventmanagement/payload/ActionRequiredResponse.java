package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.VendorAssignment;
import lombok.Builder;

import java.util.List;

@Builder
public record ActionRequiredResponse(
        List<Event> needsCoordinatorEvents,
        List<VendorAssignment> openAssignments,
        List<Inquiry> staleProposals
) {
}
