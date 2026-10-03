package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendProposalRequest {

    @NotBlank(message = "Venue is required")
    private String venue;

    private Long venueId;

    private String venueDetails;

    @NotNull(message = "Price is required")
    @Min(value = 0, message = "Price must be positive")
    private Integer price;

    @NotBlank(message = "Terms and conditions are required")
    private String terms;

    private Map<String, List<String>> vendorShortlist;

    private List<String> categories;

    private String pricingTier;
}
