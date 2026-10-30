package com.aicc.eventmanagement.payload;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HoldVenueRequest {

    @NotNull(message = "Start date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    /** Number of consecutive dates to hold, starting at startDate. */
    @NotNull(message = "Days is required")
    @Min(value = 1, message = "A hold must cover at least 1 day")
    @Max(value = 30, message = "A hold cannot cover more than 30 days")
    private Integer days;
}