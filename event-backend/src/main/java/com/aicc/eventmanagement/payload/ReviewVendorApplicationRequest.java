package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReviewVendorApplicationRequest {

    @Size(max = 500)
    private String note;
}
