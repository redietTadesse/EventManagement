package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class CreateVenueRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    private String description;

    @PositiveOrZero
    private Integer capacity;

    @Size(max = 255)
    private String location;

    @PositiveOrZero
    private BigDecimal hourlyRate;
}