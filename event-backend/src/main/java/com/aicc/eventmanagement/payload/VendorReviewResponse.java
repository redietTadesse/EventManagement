package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.VendorAssignment;
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
public class VendorReviewResponse {

    private Long assignmentId;
    private String clientName;
    private String eventName;
    private LocalDate eventDate;
    private Double rating;
    private String comment;
    private LocalDateTime reviewedAt;

    public static VendorReviewResponse from(VendorAssignment assignment) {
        Event event = assignment.getEvent();
        Inquiry inquiry = event != null ? event.getInquiry() : null;

        return VendorReviewResponse.builder()
                .assignmentId(assignment.getId())
                .clientName(inquiry != null ? inquiry.getClientName() : null)
                .eventName(event != null ? event.getName() : null)
                .eventDate(inquiry != null ? inquiry.getEventDate() : null)
                .rating(assignment.getVendorRating())
                .comment(assignment.getVendorRatingComment())
                .reviewedAt(assignment.getUpdatedAt())
                .build();
    }
}
