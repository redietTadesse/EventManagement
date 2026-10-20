package com.aicc.eventmanagement.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposalResponse {

    private String venue;
    private Long venueId;
    private String venueDetails;
    private Integer price;
    private String terms;
    private String pricingTier;
    private List<String> categories;
    private Map<String, List<String>> vendorShortlist;
    private LocalDateTime sentDate;
}