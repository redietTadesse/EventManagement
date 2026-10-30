package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorAssignmentResponse {

    private Long id;

    // Event context
    private Long eventId;
    private String eventName;
    private String eventStatus;
    private LocalDate eventDate;
    private String eventVenue;
    private String eventClientName;
    private Integer expectedAttendees;

    // Vendor context
    private Long vendorId;
    private String vendorName;
    private String serviceCategory;

    // Assignment lifecycle
    private VendorAssignmentStatus status;
    private LocalDateTime assignedAt;
    private LocalDateTime respondedAt;
    private String declineReason;
    private Double vendorRating;
    private String serviceOrder;

    public static VendorAssignmentResponse from(VendorAssignment assignment) {
        Event event = assignment.getEvent();
        Inquiry inquiry = event != null ? event.getInquiry() : null;

        return VendorAssignmentResponse.builder()
            .id(assignment.getId())
            // event context
            .eventId(event != null ? event.getId() : null)
            .eventName(event != null ? event.getName() : null)
            .eventStatus(event != null && event.getStatus() != null
                ? event.getStatus().name() : null)
            .eventDate(inquiry != null ? inquiry.getEventDate() : null)
            .eventVenue(event != null ? event.getVenue() : null)
            .eventClientName(inquiry != null ? inquiry.getClientName() : null)
            .expectedAttendees(inquiry != null ? inquiry.getExpectedAttendees() : null)
            // vendor context
            .vendorId(assignment.getVendor() != null ? assignment.getVendor().getId() : null)
            .vendorName(assignment.getVendorName())
            .serviceCategory(assignment.getServiceCategory())
            // lifecycle
            .status(assignment.getStatus())
            .assignedAt(assignment.getAssignedAt())
            .respondedAt(assignment.getRespondedAt())
            .declineReason(assignment.getDeclineReason())
            .vendorRating(assignment.getVendorRating())
            .serviceOrder(inquiry != null ? inquiry.getRequirements() : null)
            .build();
    }
}