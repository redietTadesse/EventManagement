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
    @jakarta.validation.constraints.Size(max=200) private String eventName;
    @jakarta.validation.constraints.Future private java.time.LocalDate eventDate;
    private java.time.LocalDate endDate;
    @Min(1) private Integer expectedAttendees;
    @jakarta.validation.constraints.Pattern(regexp="THEATRE|CLASSROOM|BANQUET|CABARET|BOARDROOM|U_SHAPE|UNDECIDED")
    private String tableSetup;

    @NotBlank(message = "Venue is required")
    private String venue;

    @NotNull(message = "Select a venue from the availability list")
    private Long venueId;

    private String venueDetails;

    @NotNull(message = "Price is required")
    @Min(value = 1, message = "Price must be positive")
    private Integer price;

    @NotBlank(message = "Terms and conditions are required")
    private String terms;

    private Map<String, List<Long>> vendorShortlist;

    private List<String> categories;

    private String pricingTier;
}
