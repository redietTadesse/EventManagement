package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorAssignmentResponse {

    private Long id;
    private Long eventId;
    private String eventName;
    private String eventStatus;
    private Long vendorId;
    private String vendorName;
    private String serviceCategory;
    private VendorAssignmentStatus status;
    private LocalDateTime assignedAt;
    private LocalDateTime respondedAt;
    private String declineReason;
    private Double vendorRating;

    public static VendorAssignmentResponse from(VendorAssignment assignment) {
        return VendorAssignmentResponse.builder()
            .id(assignment.getId())
            .eventId(assignment.getEvent().getId())
            .eventName(assignment.getEvent().getName())
            .eventStatus(assignment.getEvent().getStatus() != null ?
                assignment.getEvent().getStatus().name() : null)
            .vendorId(assignment.getVendor().getId())
            .vendorName(assignment.getVendorName())
            .serviceCategory(assignment.getServiceCategory())
            .status(assignment.getStatus())
            .assignedAt(assignment.getAssignedAt())
            .respondedAt(assignment.getRespondedAt())
            .declineReason(assignment.getDeclineReason())
            .vendorRating(assignment.getVendorRating())
            .build();
    }
}