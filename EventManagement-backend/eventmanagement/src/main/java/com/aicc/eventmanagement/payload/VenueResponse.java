package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Venue;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class VenueResponse {

    private Long id;
    private String name;
    private String description;
    private Integer capacity;
    private String location;
    private BigDecimal hourlyRate;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static VenueResponse from(Venue venue) {
        return VenueResponse.builder()
                .id(venue.getId())
                .name(venue.getName())
                .description(venue.getDescription())
                .capacity(venue.getCapacity())
                .location(venue.getLocation())
                .hourlyRate(venue.getHourlyRate())
                .active(venue.isActive())
                .createdAt(venue.getCreatedAt())
                .updatedAt(venue.getUpdatedAt())
                .build();
    }
}