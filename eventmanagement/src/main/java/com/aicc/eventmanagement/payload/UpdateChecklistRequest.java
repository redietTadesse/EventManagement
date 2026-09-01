package com.aicc.eventmanagement.payload;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateChecklistRequest {
    
    @Size(max = 255, message = "Item name must not exceed 255 characters")
    private String itemName;
    
    private LocalDate dueDate;
    
    private Boolean isComplete;
}