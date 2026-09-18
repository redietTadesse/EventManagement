package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorResponseRequest {

    @NotBlank(message = "Response is required (must be 'ACCEPTED' or 'DECLINED')")
    private String response;

    private String declineReason;
}