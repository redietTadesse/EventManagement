package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class VendorPreferenceRequest {

    @NotEmpty(message = "At least one vendor must be selected")
    private List<Long> vendorIds;

    private Map<String, Long> categoryAssignments;
}