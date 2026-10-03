package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Event;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.aicc.eventmanagement.util.CategoryUtils;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    
    private Long id;
    private Long inquiryId;
    private String name;
    private String status;
    private String venue;
    private Long venueId;
    private String venueDetails;
    private List<String> requiredCategories;
    private String unfilledCategories;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ChecklistResponse> checklist;
    
    public static EventResponse from(Event event) {
        List<ChecklistResponse> checklistResponses = event.getChecklist() != null
                ? event.getChecklist().stream()
                        .map(com.aicc.eventmanagement.payload.ChecklistResponse::from)
                        .collect(Collectors.toList())
                : List.of();
        
        return EventResponse.builder()
                .id(event.getId())
                .inquiryId(event.getInquiry() != null ? event.getInquiry().getId() : null)
                .name(event.getName())
                .status(event.getStatus() != null ? event.getStatus().name() : null)
                .venue(event.getVenue())
                .venueId(event.getVenueId())
                .venueDetails(event.getVenueDetails())
                .requiredCategories(CategoryUtils.split(event.getRequiredCategories()))
                .unfilledCategories(event.getUnfilledCategories())
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .checklist(checklistResponses)
                .build();
    }
}