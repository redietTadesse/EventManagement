package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ManualAssignRequest {
    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Vendor ID is required")
    private Long vendorId;

    private String reason;

    private String serviceOrder;
}