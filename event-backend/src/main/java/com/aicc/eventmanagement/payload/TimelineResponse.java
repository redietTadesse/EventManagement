package com.aicc.eventmanagement.payload;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TimelineResponse {
    private boolean inquirySubmitted;
    private boolean proposalSent;
    private boolean venueHeld;
    private boolean vendorsConfirmed;
    private boolean eventConfirmed;
    private String venueName;
}
