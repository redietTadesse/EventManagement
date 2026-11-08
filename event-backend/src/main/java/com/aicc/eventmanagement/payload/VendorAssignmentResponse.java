
package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.SelectionReason;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class VendorAssignmentResponse {

    private Long id;
    private Long eventId;
    private String eventName;
    private LocalDate eventDate;
    private Long vendorId;
    private String vendorName;
    private String serviceCategory;
    private VendorAssignmentStatus status;
    private Double rankingScore;
    private SelectionReason selectionReason;
    private LocalDateTime expiresAt;
    private LocalDateTime assignedAt;
    private LocalDateTime expiresAt;
    private LocalDateTime respondedAt;
    private String declineReason;
    private String serviceOrder;
    private Double vendorRating;
    private String vendorRatingComment;

    public static VendorAssignmentResponse from(VendorAssignment assignment) {
        if (assignment == null) {
            return null;
        }

        return VendorAssignmentResponse.builder()
                .id(assignment.getId())
                .eventId(
                        assignment.getEvent() != null
                                ? assignment.getEvent().getId()
                                : null
                )
                .eventName(
                        assignment.getEvent() != null
                                ? assignment.getEvent().getName()
                                : null
                )
                .eventDate(
                        assignment.getEvent() != null
                                && assignment.getEvent().getInquiry() != null
                                ? assignment.getEvent().getInquiry().getEventDate()
                                : null
                )
                .vendorId(
                        assignment.getVendor() != null
                                ? assignment.getVendor().getId()
                                : null
                )
                .vendorName(assignment.getVendorName())
                .serviceCategory(assignment.getServiceCategory())
                .status(assignment.getStatus())
                .rankingScore(assignment.getRankingScore())
                .selectionReason(assignment.getSelectionReason())
                .expiresAt(assignment.getExpiresAt())
                .assignedAt(assignment.getAssignedAt())
                .respondedAt(assignment.getRespondedAt())
                .declineReason(assignment.getDeclineReason())
                .serviceOrder(assignment.getServiceOrder())
                .vendorRating(assignment.getVendorRating())
                .vendorRatingComment(assignment.getVendorRatingComment())
                .build();
    }
}
