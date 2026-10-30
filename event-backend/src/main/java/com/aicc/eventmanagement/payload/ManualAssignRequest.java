package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualAssignRequest {

    @NotBlank(message = "Service category is required")
    private String category;

    @NotNull(message = "Vendor ID is required")
    private Long vendorId;

    @NotBlank(message = "A reason is required for coordinator assignment")
    @jakarta.validation.constraints.Size(max = 500, message = "Reason cannot exceed 500 characters")
    private String reason;
}
