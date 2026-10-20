package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Slf4j
public class InquiryResponse {
    private Long id;
    private Long clientId;
    private String clientName;
    private String eventType;
    private LocalDate eventDate;
    private Integer expectedAttendees;
    private String requirements;
    private List<String> requestedCategories;
    private List<String> categories;
    private EventStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private EventSummary event;
    private ProposalResponse proposal;
    private List<Long> preferredVendorIds;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static InquiryResponse from(Inquiry inquiry) {
        InquiryResponse response = new InquiryResponse();
        response.setId(inquiry.getId());
        response.setClientId(inquiry.getClientId());
        response.setClientName(inquiry.getClientName());
        response.setEventType(inquiry.getEventType());
        response.setEventDate(inquiry.getEventDate());
        response.setExpectedAttendees(inquiry.getExpectedAttendees());
        response.setRequirements(inquiry.getRequirements());
        response.setRequestedCategories(com.aicc.eventmanagement.util.CategoryUtils.split(inquiry.getRequestedCategories()));
        response.setCategories(com.aicc.eventmanagement.util.CategoryUtils.split(inquiry.getCategories()));
        response.setStatus(inquiry.getStatus());
        response.setCreatedAt(inquiry.getCreatedAt());
        response.setUpdatedAt(inquiry.getUpdatedAt());

        if (inquiry.getPreferredVendorIds() != null && !inquiry.getPreferredVendorIds().isBlank()) {
            try {
                response.setPreferredVendorIds(
                        objectMapper.readValue(inquiry.getPreferredVendorIds(), new TypeReference<List<Long>>() {})
                );
            } catch (Exception e) {
                log.warn("Failed to parse preferredVendorIds for inquiry {}: {}", inquiry.getId(), e.getMessage());
            }
        }

        if (inquiry.getProposal() != null && !inquiry.getProposal().isBlank()) {
            try {
                response.setProposal(parseProposal(inquiry.getProposal()));
            } catch (Exception e) {
                log.warn("Failed to parse proposal JSON for inquiry {}: {}", inquiry.getId(), e.getMessage());
            }
        }

        if (inquiry.getEvent() != null) {
            EventSummary summary = new EventSummary();
            summary.setId(inquiry.getEvent().getId());
            summary.setName(inquiry.getEvent().getName());
            summary.setStatus(inquiry.getEvent().getStatus());
            response.setEvent(summary);
        }
        return response;
    }

    private static ProposalResponse parseProposal(String proposalJson) throws JsonProcessingException {
        Map<String, Object> proposalMap = objectMapper.readValue(proposalJson, new TypeReference<>() {});

        ProposalResponse proposal = new ProposalResponse();
        proposal.setVenue((String) proposalMap.get("venue"));
        proposal.setVenueId(proposalMap.get("venueId") != null ? ((Number) proposalMap.get("venueId")).longValue() : null);
        proposal.setVenueDetails((String) proposalMap.get("venueDetails"));
        proposal.setPrice(proposalMap.get("price") != null ? ((Number) proposalMap.get("price")).intValue() : null);
        proposal.setTerms((String) proposalMap.get("terms"));
        proposal.setPricingTier((String) proposalMap.get("pricingTier"));

        if (proposalMap.containsKey("categories") && proposalMap.get("categories") != null) {
            Object rawCategories = proposalMap.get("categories");
            if (rawCategories instanceof List<?> list) {
                proposal.setCategories(list.stream().map(String::valueOf).toList());
            }
        }

        if (proposalMap.containsKey("vendorShortlist") && proposalMap.get("vendorShortlist") != null) {
            @SuppressWarnings("unchecked")
            Map<String, List<String>> shortlist = (Map<String, List<String>>) proposalMap.get("vendorShortlist");
            proposal.setVendorShortlist(shortlist);
        }

        if (proposalMap.containsKey("sentDate") && proposalMap.get("sentDate") != null) {
            proposal.setSentDate(LocalDateTime.parse((String) proposalMap.get("sentDate")));
        }

        return proposal;
    }
}