package com.aicc.eventmanagement.controllers;
import com.aicc.eventmanagement.entities.*;
import com.aicc.eventmanagement.enums.*;
import com.aicc.eventmanagement.repositories.*;
import com.aicc.eventmanagement.services.*;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.util.VenueBookingWindow;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor @Transactional
public class InquiryBusinessController {
    private final InquiryRepository inquiries;
    private final ProposalRevisionRepository revisions;
    private final RecordAccessService access;
    private final BookingAgreementRepository agreements;
    private final VenueService venues;
    private final ObjectMapper json;
    public record Feedback(String experience) {}
    @PostMapping("/inquiries/{id}/experience") @PreAuthorize("hasRole('CLIENT')")
    public Map<String,String> experience(@PathVariable Long id, @RequestBody Feedback body, @AuthenticationPrincipal UserDetails user) {
        access.requireInquiryAccess(id, user.getUsername());
        if (!Set.of("GOOD","OK","POOR").contains(body.experience() == null ? "" : body.experience()))
            throw new BusinessException("Choose Good, Okay or Poor.", "INVALID_FEEDBACK");
        var inquiry = inquiries.findForCoordinatorUpdate(id).orElseThrow();
        inquiry.setExperience(body.experience());
        return Map.of("experience",body.experience());
    }
    @GetMapping("/inquiries/{id}/proposal-history") @PreAuthorize("hasAnyRole('CLIENT','COORDINATOR','ADMIN')")
    public List<ProposalRevision> history(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        access.requireInquiryAccess(id,user.getUsername());
        return revisions.findByInquiryIdOrderByRevisionNumberDesc(id);
    }
    public record Tentative(Long venueId, LocalDate from, LocalDate through) {}
    @GetMapping("/venues/tentative") @PreAuthorize("hasAnyRole('CLIENT','COORDINATOR','ADMIN')")
    public List<Tentative> tentative(@RequestParam LocalDate start, @RequestParam LocalDate end) {
        if (end.isBefore(start) || end.isAfter(start.plusDays(366))) throw new BusinessException("Choose a range up to one year.","INVALID_DATE_RANGE");
        List<Tentative> result=new ArrayList<>();
        for(var inquiry:inquiries.findByStatus(EventStatus.PROPOSAL_ACCEPTED)) {
            if(inquiry.getEvent()!=null)continue;
            try {
                Long venueId=json.readTree(inquiry.getProposal()).path("venueId").asLong();
                var venue=venues.getById(venueId);
                var window=VenueBookingWindow.forEvent(inquiry.getEventType(),inquiry.getEventDate(),inquiry.getEndDate(),venue.getSetupBufferDays(),venue.getTeardownBufferDays());
                if(window.through().isBefore(start)||window.from().isAfter(end))continue;
                if(!venues.hasContractHold(inquiry.getId(),venueId,window.from(),window.through()))result.add(new Tentative(venueId,window.from(),window.through()));
            } catch(Exception ex){ /* A legacy unreadable proposal cannot create a reservation. */ }
        }
        return result;
    }
    @GetMapping("/admin/dashboard/unmet-demand") @PreAuthorize("hasRole('ADMIN')")
    public Map<String,Object> demand() {
        var received=inquiries.receivedForManagement(LocalDate.now().minusDays(89).atStartOfDay(),LocalDate.now().plusDays(1).atStartOfDay());
        var unmet=received.stream().filter(i->i.getUnmetNeeds()!=null&&!i.getUnmetNeeds().isBlank()).map(i->{
            Map<String,Object> row=new LinkedHashMap<>();row.put("inquiryId",i.getId());row.put("client",i.getClientName());
            row.put("eventName",i.getEventName());row.put("eventDate",i.getEventDate());row.put("needs",i.getUnmetNeeds());
            row.put("status",i.getStatus());row.put("coordinator",i.getCoordinator()==null?"Unassigned":i.getCoordinator().getFullName());return row;
        }).toList();
        Map<String,Long> feedback=new LinkedHashMap<>();for(String choice:List.of("GOOD","OK","POOR"))feedback.put(choice,received.stream().filter(i->choice.equals(i.getExperience())).count());
        return Map.of("requests",unmet,"feedback",feedback,"received",received.size(),"periodDays",90);
    }
}
