package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import lombok.Builder;
import com.aicc.eventmanagement.entities.VendorAssignment;

import java.util.List;

@Builder
public record ActionRequiredResponse(
        List<Event> needsCoordinatorEvents,
        List<VendorAssignment> openAssignments,
        List<Inquiry> staleProposals
) {
}
