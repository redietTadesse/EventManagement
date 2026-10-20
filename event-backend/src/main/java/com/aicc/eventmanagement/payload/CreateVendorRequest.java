package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateVendorRequest {

    @NotBlank
    @Size(max = 50)
    private String username;

    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    @NotBlank
    @Size(min = 6, max = 100)
    private String password;

    @Size(max = 100)
    private String fullName;

    @Size(max = 20)
    private String phone;

    @NotBlank
    @Size(max = 255)
    private String companyName;

    @NotBlank
    @Size(max = 100)
    private String serviceCategory;

    private String description;
}
