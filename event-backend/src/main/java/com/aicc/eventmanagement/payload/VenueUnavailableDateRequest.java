package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class VenueUnavailableDateRequest {

    @NotNull
    private LocalDate date;

    @Size(max = 500)
    private String reason;
}
