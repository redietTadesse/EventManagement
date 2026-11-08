package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistResponse {
    
    private Long id;
    private Long eventId;
    private String itemName;
    private Boolean isComplete;
    private String dueDate;
    private String ownerRole;
    private List<Long> dependencyIds;
    private boolean generated;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static ChecklistResponse from(Checklist checklist) {
        return ChecklistResponse.builder()
                .id(checklist.getId())
                .eventId(checklist.getEvent() != null ? checklist.getEvent().getId() : null)
                .itemName(checklist.getItemName())
                .isComplete(checklist.isComplete())
                .dueDate(checklist.getDueDate() != null ? checklist.getDueDate().toString() : null)
                .ownerRole((checklist.getOwnerRole() != null ? checklist.getOwnerRole() : Role.COORDINATOR).name())
                .dependencyIds(checklist.getDependencies() != null
                        ? checklist.getDependencies().stream().map(Checklist::getId).toList()
                        : List.of())
                .generated(checklist.getTemplateKey() != null)
                .createdAt(checklist.getCreatedAt())
                .updatedAt(checklist.getUpdatedAt())
                .build();
    }
}
