package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.enums.EventStatus;
import lombok.Data;

@Data
public class EventSummary {
    private Long id;
    private String name;
    private EventStatus status;
}