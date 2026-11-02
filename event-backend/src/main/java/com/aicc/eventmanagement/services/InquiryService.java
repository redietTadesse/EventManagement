package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.events.EventCreatedEvent;
import com.aicc.eventmanagement.events.InquiryCreatedEvent;
import com.aicc.eventmanagement.events.InquiryStatusChangedEvent;
import com.aicc.eventmanagement.events.ProposalChangeRequestedEvent;
import com.aicc.eventmanagement.events.WorkflowTransitionEvent;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.ConversionPreviewResponse;
import com.aicc.eventmanagement.payload.ConvertToEventRequest;
import com.aicc.eventmanagement.payload.CreateInquiryRequest;
import com.aicc.eventmanagement.payload.SendProposalRequest;
import com.aicc.eventmanagement.payload.TimelineResponse;
import com.aicc.eventmanagement.payload.UpdateInquiryRequest;
import com.aicc.eventmanagement.payload.UpdateProposalRequest;
import com.aicc.eventmanagement.payload.VendorPreferenceRequest;
import com.aicc.eventmanagement.payload.VendorRecommendationResponse;
import com.aicc.eventmanagement.util.CategoryUtils;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final EventRepository eventRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final WorkflowEngine workflowEngine;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final VenueService venueService;
    private final VendorService vendorService;
    private final VendorRankingService rankingService;
    private final VendorRatingService ratingService;
    private final VendorAssignmentRepository assignmentRepository;
    private final VendorRepository vendorRepository;
    private final ChecklistService checklistService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private List<String> canonicalCategories(Collection<String> selected) {
        if (selected == null) return List.of();
        List<String> canonical = selected.stream()
                .filter(category -> category != null && !category.isBlank())
                .map(CategoryUtils::canonicalize)
                .distinct()
                .toList();
        List<String> unsupported = canonical.stream()
                .filter(category -> !CategoryUtils.isKnownCategory(category))
                .toList();
        if (!unsupported.isEmpty()) {
            throw new BusinessException("Unsupported event service category: " + String.join(", ", unsupported),
                    "INVALID_CATEGORY");
        }
        return canonical;
    }

    public Inquiry createInquiry(CreateInquiryRequest request) {
        if (request.getEventDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Event date cannot be in the past");
        }

        List<String> submittedCategories = request.getRequestedCategories() != null && !request.getRequestedCategories().isEmpty()
                ? request.getRequestedCategories()
                : CategoryUtils.categoriesForEventType(request.getEventType());
        List<String> requestedCategories = canonicalCategories(submittedCategories);
        if (requestedCategories.isEmpty()) {
            throw new BusinessException("Select at least one supported event service", "NO_CATEGORIES");
        }

        Inquiry inquiry = Inquiry.builder()
                .clientId(request.getClientId())
                .clientName(request.getClientName())
                .eventType(request.getEventType())
                .eventDate(request.getEventDate())
                .endDate(request.getEndDate())
                .expectedAttendees(request.getExpectedAttendees())
                .requirements(request.getRequirements())
                .requestedCategories(CategoryUtils.join(requestedCategories))
                .categories(CategoryUtils.join(requestedCategories))
                .status(EventStatus.INQUIRY_SUBMITTED)
                .build();

        Inquiry saved = inquiryRepository.save(inquiry);
        log.info("Created inquiry with id: {} for client: {}", saved.getId(), saved.getClientName());

        eventPublisher.publishEvent(new InquiryCreatedEvent(this, saved));
        return saved;
    }

    public Inquiry getInquiryById(Long id) {
        return inquiryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
    }

    public List<Inquiry> getAllInquiries() {
        return inquiryRepository.findAll();
    }

    public List<Inquiry> getInquiriesByStatus(EventStatus status) {
        return inquiryRepository.findByStatus(status);
    }

    public List<Inquiry> getInquiriesByClient(Long clientId) {
        return inquiryRepository.findByClientId(clientId);
    }

    public List<Inquiry> getInquiriesByClientAndStatus(Long clientId, EventStatus status) {
        return inquiryRepository.findByClientIdAndStatus(clientId, status);
    }

    public List<Inquiry> searchByEventType(String eventType) {
        return inquiryRepository.findByEventTypeContaining(eventType);
    }

    public List<Inquiry> searchByClientName(String clientName) {
        return inquiryRepository.findByClientNameContaining(clientName);
    }

    public List<Inquiry> searchByDateRange(LocalDate startDate, LocalDate endDate) {
        return inquiryRepository.findByEventDateBetween(startDate, endDate);
    }

    public List<Inquiry> searchByAttendeesRange(Integer minAttendees, Integer maxAttendees) {
        if (minAttendees != null && maxAttendees != null) {
            return inquiryRepository.findByExpectedAttendeesGreaterThanEqual(minAttendees).stream()
                    .filter(inquiry -> inquiry.getExpectedAttendees() <= maxAttendees)
                    .toList();
        } else if (minAttendees != null) {
            return inquiryRepository.findByExpectedAttendeesGreaterThanEqual(minAttendees);
        } else if (maxAttendees != null) {
            return inquiryRepository.findByExpectedAttendeesLessThanEqual(maxAttendees);
        }
        return getAllInquiries();
    }

    public List<Inquiry> advancedSearch(
            EventStatus status,
            Long clientId,
            String eventType,
            String clientName,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return inquiryRepository.findByFilters(status, clientId, eventType, clientName, startDate, endDate);
    }

    @Transactional
    public Inquiry updateInquiry(Long id, UpdateInquiryRequest request) {
        log.info("Updating inquiry {}", id);
        Inquiry inquiry = getInquiryById(id);

        if (request.getClientName() != null) inquiry.setClientName(request.getClientName());
        if (request.getEventType() != null) inquiry.setEventType(request.getEventType());
        if (request.getEventDate() != null) {
            if (request.getEventDate().isBefore(LocalDate.now())) {
                throw new RuntimeException("Event date cannot be in the past");
            }
            inquiry.setEventDate(request.getEventDate());
        }
        if (request.getExpectedAttendees() != null) inquiry.setExpectedAttendees(request.getExpectedAttendees());
        if (request.getRequirements() != null) inquiry.setRequirements(request.getRequirements());

        return inquiryRepository.save(inquiry);
    }

    @Transactional
    public void deleteInquiry(Long id) {
        log.info("Deleting inquiry {}", id);
        Inquiry inquiry = getInquiryById(id);
        if (inquiry.getEvent() != null) {
            throw new RuntimeException("Cannot delete inquiry with associated event. Delete the event first.");
        }
        inquiryRepository.delete(inquiry);
    }

    @Transactional
    public Inquiry updateInquiryStatus(Long id, EventStatus newStatus, Role userRole) {
        Inquiry inquiry = getInquiryById(id);
        EventStatus oldStatus = inquiry.getStatus();

        workflowEngine.validateTransition(oldStatus, newStatus, userRole);

        inquiry.setStatus(newStatus);
        Inquiry saved = inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new InquiryStatusChangedEvent(this, saved, oldStatus, newStatus));
        eventPublisher.publishEvent(new WorkflowTransitionEvent(this, oldStatus, newStatus, String.valueOf(id), userRole));

        log.info(" Inquiry {} status transitioned from {} to {} by {}", id, oldStatus, newStatus, userRole);
        return saved;
    }

    @Transactional
    public Event convertToEvent(Long inquiryId, ConvertToEventRequest request) {
        Inquiry inquiry = getInquiryById(inquiryId);

        if (inquiry.getStatus() != EventStatus.PROPOSAL_ACCEPTED) {
            throw new RuntimeException(String.format("Only accepted proposals can be converted to events. Current status: %s", inquiry.getStatus()));
        }

        if (inquiry.getEvent() != null) {
            throw new RuntimeException("This inquiry already has an event associated.");
        }

        List<String> selectedCategories = request.getCategories() != null && !request.getCategories().isEmpty()
                ? request.getCategories()
                : inquiry.getCategories() != null && !inquiry.getCategories().isBlank()
                ? CategoryUtils.split(inquiry.getCategories())
                : inquiry.getRequestedCategories() != null && !inquiry.getRequestedCategories().isBlank()
                ? CategoryUtils.split(inquiry.getRequestedCategories())
                : CategoryUtils.categoriesForEventType(inquiry.getEventType());
        selectedCategories = canonicalCategories(selectedCategories);
        String resolvedCategories = CategoryUtils.join(
                CategoryUtils.externalVendorCategories(inquiry.getEventType(), selectedCategories));

        Event event = Event.builder()
                .inquiry(inquiry)
                .name(request.getName() != null ? request.getName() : inquiry.getEventType() + " - " + inquiry.getClientName())
                .status(EventStatus.EVENT_CREATED)
                .venue(request.getVenue())
                .venueId(request.getVenueId())
                .venueDetails(request.getVenueDetails())
                .requiredCategories(resolvedCategories)
                .build();

        Event savedEvent = eventRepository.save(event);
        List<com.aicc.eventmanagement.entities.Checklist> checklistItems =
                checklistService.generateMissingTemplateTasks(savedEvent.getId());

        // Book venue without catching the exception so that conflicts roll back the whole transaction.
        if (request.getVenueId() != null) {
            venueService.bookVenue(
                    request.getVenueId(),
                    savedEvent.getId(),
                    inquiry.getEventDate(),
                    inquiry.getEndDate()
            );
            log.info("Venue {} booked for event {} on {}", request.getVenueId(), savedEvent.getId(), inquiry.getEventDate());
        }

        vendorService.autoAssignForEvent(savedEvent);
        log.info("Auto-assignment completed for event {}", savedEvent.getId());

        workflowEngine.validateTransition(EventStatus.PROPOSAL_ACCEPTED, EventStatus.EVENT_CREATED, Role.COORDINATOR);

        inquiry.setStatus(EventStatus.EVENT_CREATED);
        inquiry.setEvent(savedEvent);
        inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new EventCreatedEvent(this, savedEvent));
        eventPublisher.publishEvent(new WorkflowTransitionEvent(this, EventStatus.PROPOSAL_ACCEPTED,
                EventStatus.EVENT_CREATED, String.valueOf(inquiryId), Role.COORDINATOR));

        log.info("Converted inquiry {} to event {} ({} checklist items)", inquiryId, savedEvent.getId(), checklistItems.size());
        return savedEvent;
    }

    @Transactional(readOnly = true)
    public ConversionPreviewResponse previewConversion(Long inquiryId) {
        Inquiry inquiry = getInquiryById(inquiryId);

        if (inquiry.getStatus() != EventStatus.PROPOSAL_ACCEPTED) {
            throw new BusinessException("Only accepted proposals can be previewed for conversion. Current status: " + inquiry.getStatus(), "INVALID_STATE");
        }
        if (inquiry.getEvent() != null) {
            throw new BusinessException("This inquiry already has an event associated.", "ALREADY_CONVERTED");
        }

        List<String> requiredCategories = resolvePreviewCategories(inquiry);
        LocalDate eventDate = inquiry.getEventDate();
        ConversionPreviewResponse.VenuePreview venuePreview = buildVenuePreview(inquiry, eventDate);

        List<ConversionPreviewResponse.CategoryPreview> categoryPreviews = new ArrayList<>();
        for (String category : requiredCategories) {
            VendorRankingService.DecisionPreview decision = rankingService.preview(
                    category, eventDate, inquiry.getEventType());
            List<ConversionPreviewResponse.VendorCandidate> candidates = new ArrayList<>();
            for (int i = 0; i < Math.min(3, decision.eligible().size()); i++) {
                VendorRankingService.Ranked r = decision.eligible().get(i);
                var v = r.vendor();
                boolean hasDeclined = hasRecentDecline(v.getId(), category);
                long load = assignmentRepository.countActiveAndPendingByVendor(v.getId());

                candidates.add(ConversionPreviewResponse.VendorCandidate.builder()
                        .vendorId(v.getId())
                        .companyName(v.getCompanyName())
                        .rating(r.rating())
                        .currentLoad(load)
                        .score(r.score())
                        .qualityScore(r.qualityScore())
                        .workloadScore(r.workloadScore())
                        .rotationScore(r.rotationScore())
                        .rank(i + 1)
                        .hasRecentDecline(hasDeclined)
                        .build());
            }
            List<ConversionPreviewResponse.ExcludedCandidate> excluded = decision.excluded().stream()
                    .map(candidate -> ConversionPreviewResponse.ExcludedCandidate.builder()
                            .vendorId(candidate.vendorId())
                            .companyName(candidate.vendorName())
                            .reason(candidate.reason())
                            .build())
                    .toList();

            String warning = null;
            if (candidates.isEmpty()) {
                warning = "No eligible vendors available for this category on " + eventDate;
            } else if (candidates.get(0).isHasRecentDecline()) {
                warning = "Top-ranked vendor has declined a similar offer in the last 30 days";
            }

            categoryPreviews.add(ConversionPreviewResponse.CategoryPreview.builder()
                    .category(category)
                    .candidates(candidates)
                    .excludedCandidates(excluded)
                    .warning(warning)
                    .build());
        }

        return ConversionPreviewResponse.builder()
                .inquiryId(inquiryId)
                .eventType(inquiry.getEventType())
                .eventDate(eventDate)
                .expectedAttendees(inquiry.getExpectedAttendees())
                .requiredCategories(requiredCategories)
                .venue(venuePreview)
                .categories(categoryPreviews)
                .timelineEstimate("Vendors typically respond within 2 days. Event should reach Confirmed within 5 days if all vendors accept.")
                .build();
    }

    private List<String> resolvePreviewCategories(Inquiry inquiry) {
        List<String> selected = inquiry.getCategories() != null && !inquiry.getCategories().isBlank()
                ? CategoryUtils.split(inquiry.getCategories())
                : inquiry.getRequestedCategories() != null && !inquiry.getRequestedCategories().isBlank()
                ? CategoryUtils.split(inquiry.getRequestedCategories())
                : CategoryUtils.categoriesForEventType(inquiry.getEventType());
        return CategoryUtils.externalVendorCategories(inquiry.getEventType(), selected);
    }

    private ConversionPreviewResponse.VenuePreview buildVenuePreview(Inquiry inquiry, LocalDate eventDate) {
        if (inquiry.getProposal() == null || inquiry.getProposal().isBlank()) {
            return ConversionPreviewResponse.VenuePreview.builder().available(false).message("No proposal attached to this inquiry").build();
        }
        try {
            Map<String, Object> proposal = objectMapper.readValue(inquiry.getProposal(), new TypeReference<>() {});
            Long venueId = proposal.get("venueId") != null ? ((Number) proposal.get("venueId")).longValue() : null;
            String venueName = (String) proposal.get("venue");

            if (venueId == null) {
                String message = "No specific venue selected in proposal";
                return ConversionPreviewResponse.VenuePreview.builder().venueName(venueName).available(false)
                        .message(message).explanation(List.of(message)).build();
            }

            Venue venue = venueService.getById(venueId);
            LocalDate endDate = inquiry.getEndDate() != null ? inquiry.getEndDate() : eventDate;
            var fit = venueService.explainVenueFit(eventDate, endDate,
                            inquiry.getExpectedAttendees(), null).stream()
                    .filter(option -> option.venueId().equals(venueId))
                    .findFirst()
                    .orElse(null);
            boolean available = fit != null && fit.eligible();
            List<String> explanation = fit != null ? fit.explanation()
                    : List.of("Venue is no longer present in the configured venue list.");
            String message = available ? "Eligible for the event date and attendance"
                    : String.join(" ", explanation);

            return ConversionPreviewResponse.VenuePreview.builder()
                    .venueId(venueId)
                    .venueName(venue.getName() != null ? venue.getName() : venueName)
                    .capacity(venue.getCapacity())
                    .available(available)
                    .message(message)
                    .explanation(explanation)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to build venue preview for inquiry {}: {}", inquiry.getId(), e.getMessage());
            return ConversionPreviewResponse.VenuePreview.builder().available(false).message("Could not parse proposal venue details").build();
        }
    }

    private boolean hasRecentDecline(Long vendorId, String category) {
        return assignmentRepository.existsRecentDeclineByVendorAndCategory(vendorId, category, LocalDateTime.now().minusDays(30));
    }

    @Transactional
    public Inquiry sendProposal(Long id, SendProposalRequest request, Role userRole) {
        Inquiry inquiry = getInquiryById(id);
        if (inquiry.getStatus() != EventStatus.INQUIRY_SUBMITTED) {
            throw new BusinessException(String.format("Cannot send proposal. Inquiry status is: %s (expected: INQUIRY_SUBMITTED)", inquiry.getStatus()), "INVALID_STATE");
        }

        workflowEngine.validateTransition(inquiry.getStatus(), EventStatus.PROPOSAL_SENT, userRole);
        String proposalJson = buildProposalJson(request, inquiry);

        inquiry.setCategories(request.getCategories() != null && !request.getCategories().isEmpty()
                ? CategoryUtils.join(canonicalCategories(request.getCategories()))
                : inquiry.getCategories() != null && !inquiry.getCategories().isBlank() ? inquiry.getCategories() : inquiry.getRequestedCategories());
        inquiry.setProposal(proposalJson);
        inquiry.setStatus(EventStatus.PROPOSAL_SENT);

        Inquiry saved = inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new InquiryStatusChangedEvent(this, saved, EventStatus.INQUIRY_SUBMITTED, EventStatus.PROPOSAL_SENT));
        eventPublisher.publishEvent(new WorkflowTransitionEvent(this, EventStatus.INQUIRY_SUBMITTED,
                EventStatus.PROPOSAL_SENT, String.valueOf(id), userRole));

        try {
            emailService.sendProposalNotification(inquiry, getUserEmail(inquiry.getClientId()));
        } catch (Exception e) {
            log.warn("Failed to send proposal email: {}", e.getMessage());
        }

        return saved;
    }

    @Transactional
    public Inquiry acceptProposal(Long id, Role userRole) {
        return acceptProposal(id, null, userRole);
    }

    @Transactional
    public Inquiry acceptProposal(Long id, List<String> finalCategories, Role userRole) {
        Inquiry inquiry = getInquiryById(id);

        workflowEngine.validateTransition(inquiry.getStatus(), EventStatus.PROPOSAL_ACCEPTED, userRole);
        if (finalCategories != null && !finalCategories.isEmpty()) {
            inquiry.setCategories(CategoryUtils.join(canonicalCategories(finalCategories)));
        }

        inquiry.setStatus(EventStatus.PROPOSAL_ACCEPTED);
        Inquiry saved = inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new WorkflowTransitionEvent(this, EventStatus.PROPOSAL_SENT,
                EventStatus.PROPOSAL_ACCEPTED, String.valueOf(id), userRole));
        eventPublisher.publishEvent(new InquiryStatusChangedEvent(this, saved, EventStatus.PROPOSAL_SENT, EventStatus.PROPOSAL_ACCEPTED));

        return saved;
    }

    @Transactional
    public Inquiry requestProposalChanges(Long id, String feedback, Role userRole) {
        if (userRole != Role.CLIENT) {
            throw new SecurityException("Only the client can request proposal changes");
        }
        Inquiry inquiry = getInquiryById(id);
        if (inquiry.getStatus() != EventStatus.PROPOSAL_SENT) {
            throw new BusinessException("Change requests are only allowed while a proposal is pending", "INVALID_STATE");
        }
        if (feedback == null || feedback.isBlank()) {
            throw new BusinessException("Change request feedback is required", "INVALID_FEEDBACK");
        }
        String normalizedFeedback = feedback.trim();
        if (normalizedFeedback.length() > 2000) {
            throw new BusinessException("Change request feedback cannot exceed 2000 characters", "INVALID_FEEDBACK");
        }

        String existingRequirements = inquiry.getRequirements();
        inquiry.setRequirements((existingRequirements == null || existingRequirements.isBlank()
                ? "" : existingRequirements + "\n")
                + "Proposal change requested on " + LocalDateTime.now() + ": " + normalizedFeedback);
        Inquiry saved = inquiryRepository.save(inquiry);
        eventPublisher.publishEvent(new ProposalChangeRequestedEvent(this, saved));
        log.info("Client requested proposal changes for inquiry {}", id);
        return saved;
    }

    @Transactional
    public Inquiry rejectProposal(Long id, Role userRole) {
        Inquiry inquiry = getInquiryById(id);
        workflowEngine.validateTransition(inquiry.getStatus(), EventStatus.PROPOSAL_REJECTED, userRole);
        inquiry.setStatus(EventStatus.PROPOSAL_REJECTED);
        Inquiry saved = inquiryRepository.save(inquiry);
        eventPublisher.publishEvent(new WorkflowTransitionEvent(this, EventStatus.PROPOSAL_SENT,
                EventStatus.PROPOSAL_REJECTED, String.valueOf(id), userRole));
        return saved;
    }

    @Transactional
    public Inquiry updateProposal(Long id, UpdateProposalRequest request, Role userRole) {
        Inquiry inquiry = getInquiryById(id);
        if (inquiry.getStatus() != EventStatus.PROPOSAL_SENT) {
            throw new BusinessException(String.format("Cannot update proposal. Inquiry status is: %s (expected: PROPOSAL_SENT)", inquiry.getStatus()), "INVALID_STATE");
        }

        String proposalJson = buildProposalJsonInternal(request.getVenue(), request.getVenueId(), request.getVenueDetails(),
                request.getPrice(), request.getTerms(), request.getCategories(), request.getPricingTier(),
                request.getVendorShortlist(), inquiry);

        inquiry.setCategories(request.getCategories() != null && !request.getCategories().isEmpty()
                ? CategoryUtils.join(canonicalCategories(request.getCategories()))
                : inquiry.getCategories() != null && !inquiry.getCategories().isBlank() ? inquiry.getCategories() : inquiry.getRequestedCategories());
        inquiry.setProposal(proposalJson);

        Inquiry saved = inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new InquiryStatusChangedEvent(this, saved, EventStatus.PROPOSAL_SENT, EventStatus.PROPOSAL_SENT));

        log.info("Updated proposal for inquiry {} by {}", id, userRole);
        return saved;
    }

    public VendorRecommendationResponse getRecommendedVendors(Long inquiryId) {
        Inquiry inquiry = getInquiryById(inquiryId);
        List<String> categories = CategoryUtils.split(inquiry.getCategories());
        if (categories.isEmpty()) categories = CategoryUtils.split(inquiry.getRequestedCategories());
        if (categories.isEmpty()) categories = CategoryUtils.categoriesForEventType(inquiry.getEventType());
        categories = CategoryUtils.externalVendorCategories(inquiry.getEventType(), categories);
        if (categories.isEmpty()) throw new BusinessException("No categories defined for this inquiry", "NO_CATEGORIES");

        List<VendorRecommendationResponse.CategoryRecommendation> categoryResults = new ArrayList<>();
        for (String category : categories) {
            List<VendorRankingService.Ranked> ranked = rankingService.rank(
                    category, inquiry.getEventDate(), Set.of(), inquiry.getEventType());
            List<VendorRecommendationResponse.VendorOption> options = ranked.stream()
                    .limit(5)
                    .map(r -> VendorRecommendationResponse.VendorOption.builder()
                            .vendorId(r.vendor().getId())
                            .companyName(r.vendor().getCompanyName())
                            .serviceCategory(r.vendor().getServiceCategory())
                            .description(r.vendor().getDescription())
                            .rating(r.rating())
                            .availableOnEventDate(true)
                            .score(r.score())
                            .reason(buildReason(r))
                            .build())
                    .toList();

            categoryResults.add(VendorRecommendationResponse.CategoryRecommendation.builder().category(category).options(options).build());
        }

        return VendorRecommendationResponse.builder().categories(categoryResults).build();
    }

    private String buildReason(VendorRankingService.Ranked ranked) {
        if (ranked.rating() >= 4) return "Highly rated";
        if (ranked.score() > 100) return "Currently available and top-ranked";
        return "Available on your event date";
    }

    @Transactional
    public Inquiry recordVendorPreference(Long inquiryId, VendorPreferenceRequest request, Role userRole) {
        Inquiry inquiry = getInquiryById(inquiryId);
        if (userRole != Role.CLIENT && userRole != Role.ADMIN) {
            throw new BusinessException("Only the client can express a vendor preference", "ACCESS_DENIED");
        }
        if (inquiry.getStatus() != EventStatus.PROPOSAL_SENT && inquiry.getStatus() != EventStatus.INQUIRY_SUBMITTED) {
            throw new BusinessException(String.format("Cannot record preference in status: %s", inquiry.getStatus()), "INVALID_STATE");
        }

        try {
            inquiry.setPreferredVendorIds(objectMapper.writeValueAsString(request.getVendorIds()));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize vendor preferences", e);
        }

        Inquiry saved = inquiryRepository.save(inquiry);
        log.info("Client recorded preference for inquiry {}: vendors={}", inquiryId, request.getVendorIds());
        return saved;
    }

    private String buildProposalJson(SendProposalRequest request, Inquiry inquiry) {
        return buildProposalJsonInternal(request.getVenue(), request.getVenueId(), request.getVenueDetails(),
                request.getPrice(), request.getTerms(), request.getCategories(), request.getPricingTier(),
                request.getVendorShortlist(), inquiry);
    }

    private String buildProposalJsonInternal(String venue, Long venueId, String venueDetails, Integer price,
                                             String terms, List<String> categories, String pricingTier,
                                             Map<String, List<Long>> vendorShortlist, Inquiry inquiry) {
        try {
            Map<String, Object> proposal = new LinkedHashMap<>();
            proposal.put("proposalNumber", String.format("AICC-P-%d-%03d", LocalDate.now().getYear(), inquiry.getId()));
            proposal.put("sentDate", LocalDateTime.now().toString());
            proposal.put("expiryDate", LocalDateTime.now().plusDays(7).toString());
            proposal.put("venue", venue);
            proposal.put("venueId", venueId);
            proposal.put("venueDetails", venueDetails);
            proposal.put("price", price);
            proposal.put("terms", terms);
            proposal.put("categories", categories);
            proposal.put("pricingTier", pricingTier != null ? pricingTier : "standard");

            // Enrich vendor shortlist with vendor details
            List<Map<String, Object>> enrichedShortlist = new ArrayList<>();
            if (vendorShortlist != null && !vendorShortlist.isEmpty()) {
                for (Map.Entry<String, List<Long>> entry : vendorShortlist.entrySet()) {
                    Map<String, Object> catMap = new LinkedHashMap<>();
                    catMap.put("category", entry.getKey());

                    List<Map<String, Object>> vendorsForCat = new ArrayList<>();
                    for (Long vendorId : entry.getValue()) {
                        vendorRepository.findById(vendorId).ifPresent(v -> {
                            Map<String, Object> vMap = new LinkedHashMap<>();
                            vMap.put("id", v.getId());
                            vMap.put("companyName", v.getCompanyName());
                            vMap.put("rating", ratingService.calculateVendorRating(v));
                            vMap.put("description", v.getDescription());
                            vendorsForCat.add(vMap);
                        });
                    }
                    catMap.put("vendors", vendorsForCat);
                    enrichedShortlist.add(catMap);
                }
            }
            proposal.put("vendorShortlist", enrichedShortlist);

            proposal.put("clientName", inquiry.getClientName());
            proposal.put("eventType", inquiry.getEventType());
            proposal.put("eventDate", inquiry.getEventDate().toString());
            proposal.put("expectedAttendees", inquiry.getExpectedAttendees());
            return objectMapper.writeValueAsString(proposal);
        } catch (Exception e) {
            log.error("Failed to build proposal JSON", e);
            throw new RuntimeException("Failed to create proposal", e);
        }
    }

    private String getUserEmail(Long userId) {
        return userRepository.findById(userId).map(User::getEmail).orElse("client@example.com");
    }

    public TimelineResponse getTimeline(Long inquiryId) {
        Inquiry inquiry = getInquiryById(inquiryId);

        boolean hasProposal = inquiry.getProposal() != null;
        boolean isAccepted = inquiry.getStatus() == EventStatus.PROPOSAL_ACCEPTED || inquiry.getEvent() != null;

        boolean isConfirmed = false;
        boolean allVendorsAccepted = false;
        String venueName = null;

        if (inquiry.getEvent() != null) {
            Event event = inquiry.getEvent();
            venueName = event.getVenue();

            if (event.getStatus() == EventStatus.CONFIRMED || event.getStatus() == EventStatus.COMPLETED) {
                isConfirmed = true;
            }

            List<com.aicc.eventmanagement.entities.VendorAssignment> assignments = assignmentRepository.findByEventId(event.getId());
            List<String> requiredCats = CategoryUtils.split(event.getRequiredCategories());

            if (!requiredCats.isEmpty()) {
                allVendorsAccepted = requiredCats.stream().allMatch(cat ->
                    assignments.stream().anyMatch(a -> a.getServiceCategory().equals(cat) &&
                        (a.getStatus() == VendorAssignmentStatus.ACCEPTED || a.getStatus() == VendorAssignmentStatus.COMPLETED))
                );
            }
        }

        return TimelineResponse.builder()
                .inquirySubmitted(true)
                .proposalSent(hasProposal)
                .venueHeld(isAccepted)
                .vendorsConfirmed(allVendorsAccepted)
                .eventConfirmed(isConfirmed)
                .venueName(venueName)
                .build();
    }
}
