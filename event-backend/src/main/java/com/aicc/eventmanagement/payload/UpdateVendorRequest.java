package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateVendorRequest {

    @Size(max = 255)
    private String companyName;

    @Size(max = 100)
    private String serviceCategory;

    private String description;

    @Size(max = 20)
    private String phone;

    @Email
    @Size(max = 100)
    private String email;

    private Boolean active;
}
