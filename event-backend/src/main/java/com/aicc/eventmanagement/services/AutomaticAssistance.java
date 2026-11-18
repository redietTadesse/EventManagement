
package com.aicc.eventmanagement.services;
import com.aicc.eventmanagement.entities.*;
import com.aicc.eventmanagement.events.VendorAssignmentEvent;
import com.aicc.eventmanagement.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;

@Service @RequiredArgsConstructor
public class AutomaticAssistance {
 private final AssistanceActivityRepository activity;
 private final VendorAssignmentRepository assignments;

 @Transactional(propagation=Propagation.MANDATORY)
 public void record(Inquiry inquiry, Long eventId, String category, String title, String detail, boolean attention) {
   if (inquiry == null) return;
   AssistanceActivity row = new AssistanceActivity();
   row.setInquiryId(inquiry.getId()); row.setEventId(eventId); row.setCategory(category);
   row.setTitle(title); row.setDetail(detail); row.setNeedsAttention(attention); row.setCreatedAt(Instant.now());
   activity.save(row);
 }

 @EventListener
 public void vendorOffer(VendorAssignmentEvent notice) {
   var offer = notice.getAssignment();
   var event = offer.getEvent();
   if (event == null || event.getInquiry() == null) return;
   String title;
   String detail;
   switch (offer.getStatus()) {
     case PENDING -> {
       var reason = offer.getSelectionReason();
       if (reason == com.aicc.eventmanagement.enums.SelectionReason.COORDINATOR_MANUAL
           || reason == com.aicc.eventmanagement.enums.SelectionReason.COORDINATOR_FORCED
           || reason == com.aicc.eventmanagement.enums.SelectionReason.POOL_CLAIM) return;
       boolean replacement = assignments.findByEventIdAndServiceCategory(event.getId(), offer.getServiceCategory()).stream()
         .anyMatch(previous -> !previous.getId().equals(offer.getId()) &&
             (previous.getStatus() == com.aicc.eventmanagement.enums.VendorAssignmentStatus.DECLINED
              || previous.getStatus() == com.aicc.eventmanagement.enums.VendorAssignmentStatus.EXPIRED));
       title = replacement ? "A replacement vendor was selected" : "A vendor offer was prepared";
       detail = offer.getServiceCategory() + " · " + offer.getVendorName() + " · Awaiting the vendor's response.";
     }
     case EXPIRED -> { title = "A vendor response deadline passed"; detail = offer.getServiceCategory() + " · " + offer.getVendorName() + " did not respond in time."; }
     default -> { return; }
   }
   record(event.getInquiry(), event.getId(), "VENDORS", title, detail, false);
 }

 @Transactional(readOnly=true)
 public List<AssistanceActivity> recent(String username) { return activity.recent(username, PageRequest.of(0, 50)); }
}
