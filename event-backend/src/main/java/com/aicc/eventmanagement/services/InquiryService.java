package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.events.EventCreatedEvent;
import com.aicc.eventmanagement.events.InquiryCreatedEvent;
import com.aicc.eventmanagement.events.InquiryStatusChangedEvent;
import com.aicc.eventmanagement.events.WorkflowTransitionEvent;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.ConvertToEventRequest;
import com.aicc.eventmanagement.payload.CreateInquiryRequest;
import com.aicc.eventmanagement.payload.SendProposalRequest;
import com.aicc.eventmanagement.payload.UpdateInquiryRequest;
import com.aicc.eventmanagement.payload.VendorPreferenceRequest;
import com.aicc.eventmanagement.payload.VendorRecommendationResponse;
import com.aicc.eventmanagement.util.CategoryUtils;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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

    private final VendorRankingService vendorRankingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Map<String, List<String>> CHECKLIST_TEMPLATES = Map.of(
            "conference", List.of("Book main hall", "Arrange AV equipment", "Arrange catering service", "Arrange security", "Set up registration desk"),
            "wedding", List.of("Book ceremony venue", "Arrange catering service", "Arrange photography", "Book music / DJ", "Order flowers"),
            "trade_show", List.of("Book exhibition space", "Arrange booth setup", "Arrange security", "Arrange cleaning services", "Confirm exhibitor list"),
            "exhibition", List.of("Book exhibition space", "Arrange booth setup", "Arrange security", "Arrange cleaning services", "Confirm exhibitor list"),
            "concert", List.of("Book venue", "Arrange stage setup", "Arrange AV equipment", "Arrange security", "Confirm artist line-up"),
            "gala", List.of("Book ballroom", "Arrange catering service", "Arrange photography", "Book music / DJ", "Arrange security"),
            "seminar", List.of("Book meeting room", "Arrange AV equipment", "Arrange catering")
    );

    public Inquiry createInquiry(CreateInquiryRequest request) {
        if (request.getEventDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Event date cannot be in the past");
        }

        List<String> requestedCategories = request.getRequestedCategories() != null && !request.getRequestedCategories().isEmpty()
                ? request.getRequestedCategories()
                : CategoryUtils.EVENT_TYPE_DEFAULTS.getOrDefault(request.getEventType(), List.of());

        Inquiry inquiry = Inquiry.builder()
                .clientId(request.getClientId())
                .clientName(request.getClientName())
                .eventType(request.getEventType())
                .eventDate(request.getEventDate())
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

        if (request.getClientName() != null) {
            inquiry.setClientName(request.getClientName());
        }
        if (request.getEventType() != null) {
            inquiry.setEventType(request.getEventType());
        }
        if (request.getEventDate() != null) {
            if (request.getEventDate().isBefore(LocalDate.now())) {
                throw new RuntimeException("Event date cannot be in the past");
            }
            inquiry.setEventDate(request.getEventDate());
        }
        if (request.getExpectedAttendees() != null) {
            inquiry.setExpectedAttendees(request.getExpectedAttendees());
        }
        if (request.getRequirements() != null) {
            inquiry.setRequirements(request.getRequirements());
        }

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

        eventPublisher.publishEvent(new WorkflowTransitionEvent(
                this,
                oldStatus,
                newStatus,
                String.valueOf(id),
                userRole
        ));

        log.info(" Inquiry {} status transitioned from {} to {} by {}",
                id, oldStatus, newStatus, userRole);
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

        String resolvedCategories = request.getCategories() != null && !request.getCategories().isEmpty()
                ? CategoryUtils.join(request.getCategories())
                : inquiry.getCategories() != null && !inquiry.getCategories().isBlank()
                ? inquiry.getCategories()
                : inquiry.getRequestedCategories() != null && !inquiry.getRequestedCategories().isBlank()
                ? inquiry.getRequestedCategories()
                : CategoryUtils.join(CategoryUtils.EVENT_TYPE_DEFAULTS.getOrDefault(inquiry.getEventType(), List.of()));

        Event event = Event.builder()
                .inquiry(inquiry)
                .name(request.getName() != null ? request.getName() : inquiry.getEventType() + " - " + inquiry.getClientName())
                .status(EventStatus.EVENT_CREATED)
                .venue(request.getVenue())
                .venueId(request.getVenueId())
                .venueDetails(request.getVenueDetails())
                .requiredCategories(resolvedCategories)
                .build();

        List<Checklist> checklistItems = generateChecklistForEventType(inquiry.getEventType());
        checklistItems.forEach(event::addChecklistItem);

        Event savedEvent = eventRepository.save(event);

        if (request.getVenueId() != null) {
            try {
                venueService.bookVenue(
                        request.getVenueId(),
                        savedEvent.getId(),
                        inquiry.getEventDate()
                );
                log.info("Venue {} booked for event {} on {}",
                        request.getVenueId(), savedEvent.getId(), inquiry.getEventDate());
            } catch (BusinessException e) {
                log.warn("Venue booking failed for event {}: {}", savedEvent.getId(), e.getMessage());
            }
        }

        // Trigger vendor assignment on the primary path. This method participates in
        // the conversion transaction, so assignment failure must roll back conversion
        // rather than being caught and surfaced later as UnexpectedRollbackException.
        vendorService.autoAssignForEvent(savedEvent);
        log.info("Auto-assignment completed for event {}", savedEvent.getId());

        // -----------------------------------------------------------------
        // Now transition the inquiry from PROPOSAL_ACCEPTED to EVENT_CREATED
        // Validate via WorkflowEngine before changing status
        // -----------------------------------------------------------------
        workflowEngine.validateTransition(
                EventStatus.PROPOSAL_ACCEPTED,
                EventStatus.EVENT_CREATED,
                Role.COORDINATOR
        );

        inquiry.setStatus(EventStatus.EVENT_CREATED);
        inquiry.setEvent(savedEvent);
        inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new EventCreatedEvent(this, savedEvent));

        eventPublisher.publishEvent(new WorkflowTransitionEvent(
                this,
                EventStatus.PROPOSAL_ACCEPTED,
                EventStatus.EVENT_CREATED,
                String.valueOf(inquiryId),
                Role.COORDINATOR
        ));

        log.info("Converted inquiry {} to event {} ({} checklist items)", inquiryId, savedEvent.getId(), checklistItems.size());
        return savedEvent;
    }

    private List<Checklist> generateChecklistForEventType(String eventType) {
        List<String> items = CHECKLIST_TEMPLATES.getOrDefault(eventType, List.of("Book venue", "Arrange services"));
        List<Checklist> checklist = new ArrayList<>();
        for (String itemName : items) {
            Checklist item = Checklist.builder()
                    .itemName(itemName)
                    .isComplete(false)
                    .dueDate(LocalDate.now().plusDays(7))
                    .build();
            checklist.add(item);
        }
        return checklist;
    }

    @Transactional
    public Inquiry sendProposal(Long id, SendProposalRequest request, Role userRole) {
        Inquiry inquiry = getInquiryById(id);

        if (inquiry.getStatus() != EventStatus.INQUIRY_SUBMITTED) {
            throw new BusinessException(
                    String.format("Cannot send proposal. Inquiry status is: %s (expected: INQUIRY_SUBMITTED)",
                            inquiry.getStatus()),
                    "INVALID_STATE"
            );
        }

        workflowEngine.validateTransition(
                inquiry.getStatus(),
                EventStatus.PROPOSAL_SENT,
                userRole
        );

        String proposalJson = buildProposalJson(request, inquiry);

        inquiry.setCategories(
                request.getCategories() != null && !request.getCategories().isEmpty()
                        ? CategoryUtils.join(request.getCategories())
                        : inquiry.getCategories() != null && !inquiry.getCategories().isBlank()
                        ? inquiry.getCategories()
                        : inquiry.getRequestedCategories()
        );
        inquiry.setProposal(proposalJson);
        inquiry.setStatus(EventStatus.PROPOSAL_SENT);

        Inquiry saved = inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new InquiryStatusChangedEvent(
                this,
                saved,
                EventStatus.INQUIRY_SUBMITTED,
                EventStatus.PROPOSAL_SENT
        ));

        eventPublisher.publishEvent(new WorkflowTransitionEvent(
                this,
                EventStatus.INQUIRY_SUBMITTED,
                EventStatus.PROPOSAL_SENT,
                String.valueOf(id),
                userRole
        ));

        try {
            String clientEmail = getUserEmail(inquiry.getClientId());
            emailService.sendProposalNotification(inquiry, clientEmail);
            log.info(" Proposal notification sent to client: {}", clientEmail);
        } catch (Exception e) {
            log.warn("Failed to send proposal email: {}", e.getMessage());
        }

        log.info(" Proposal sent for inquiry {} by {}", id, userRole);
        return saved;
    }

    @Transactional
    public Inquiry acceptProposal(Long id, Role userRole) {
        return acceptProposal(id, null, userRole);
    }

    @Transactional
    public Inquiry acceptProposal(Long id, List<String> finalCategories, Role userRole) {
        Inquiry inquiry = getInquiryById(id);

        workflowEngine.validateTransition(
                inquiry.getStatus(),
                EventStatus.PROPOSAL_ACCEPTED,
                userRole
        );

        if (finalCategories != null && !finalCategories.isEmpty()) {
            inquiry.setCategories(CategoryUtils.join(finalCategories));
        }

        inquiry.setStatus(EventStatus.PROPOSAL_ACCEPTED);

        Inquiry saved = inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new WorkflowTransitionEvent(
                this,
                EventStatus.PROPOSAL_SENT,
                EventStatus.PROPOSAL_ACCEPTED,
                String.valueOf(id),
                userRole
        ));

        eventPublisher.publishEvent(new InquiryStatusChangedEvent(
                this,
                saved,
                EventStatus.PROPOSAL_SENT,
                EventStatus.PROPOSAL_ACCEPTED
        ));

        log.info("Proposal accepted for inquiry {} by {} (categories={})", id, userRole, saved.getCategories());
        return saved;
    }

    @Transactional
    public Inquiry rejectProposal(Long id, String reason, Role userRole) {
        Inquiry inquiry = getInquiryById(id);

        workflowEngine.validateTransition(
                inquiry.getStatus(),
                EventStatus.PROPOSAL_REJECTED,
                userRole
        );

        inquiry.setStatus(EventStatus.PROPOSAL_REJECTED);

        if (reason != null) {
            String currentReqs = inquiry.getRequirements();
            inquiry.setRequirements(
                    (currentReqs != null ? currentReqs + "\n" : "") +
                            "Proposal rejected on " + LocalDateTime.now() + ": " + reason
            );
        }

        Inquiry saved = inquiryRepository.save(inquiry);

        eventPublisher.publishEvent(new WorkflowTransitionEvent(
                this,
                EventStatus.PROPOSAL_SENT,
                EventStatus.PROPOSAL_REJECTED,
                String.valueOf(id),
                userRole
        ));

        log.info("Proposal rejected for inquiry {} by {}", id, userRole);
        return saved;
    }

    // ============================================================
    // CLIENT-FACING VENDOR RECOMMENDATIONS
    // ============================================================

    public VendorRecommendationResponse getRecommendedVendors(Long inquiryId) {
        Inquiry inquiry = getInquiryById(inquiryId);

        List<String> categories = CategoryUtils.split(inquiry.getCategories());
        if (categories.isEmpty()) {
            categories = CategoryUtils.split(inquiry.getRequestedCategories());
        }
        if (categories.isEmpty()) {
            categories = CategoryUtils.EVENT_TYPE_DEFAULTS.getOrDefault(inquiry.getEventType(), List.of());
        }

        if (categories.isEmpty()) {
            throw new BusinessException(
                    "No categories defined for this inquiry",
                    "NO_CATEGORIES");
        }

        List<VendorRecommendationResponse.CategoryRecommendation> categoryResults = new ArrayList<>();

        for (String category : categories) {
            List<VendorRankingService.Ranked> ranked =
                    vendorRankingService.rank(category, inquiry.getEventDate(), Set.of());

            List<VendorRecommendationResponse.VendorOption> options = ranked.stream()
                    .limit(5)
                    .map(r -> VendorRecommendationResponse.VendorOption.builder()
                            .vendorId(r.vendor().getId())
                            .companyName(r.vendor().getCompanyName())
                            .serviceCategory(r.vendor().getServiceCategory())
                            .description(r.vendor().getDescription())
                            .rating(r.vendor().getRating())
                            .availableOnEventDate(true)
                            .score(r.score())
                            .reason(buildReason(r))
                            .build())
                    .toList();

            categoryResults.add(VendorRecommendationResponse.CategoryRecommendation.builder()
                    .category(category)
                    .options(options)
                    .build());
        }

        return VendorRecommendationResponse.builder()
                .categories(categoryResults)
                .build();
    }

    private String buildReason(VendorRankingService.Ranked ranked) {
        if (ranked.vendor().getRating() != null && ranked.vendor().getRating() >= 4) {
            return "Highly rated";
        }
        if (ranked.score() > 100) {
            return "Currently available and top-ranked";
        }
        return "Available on your event date";
    }

    @Transactional
    public Inquiry recordVendorPreference(Long inquiryId, VendorPreferenceRequest request, Role userRole) {
        Inquiry inquiry = getInquiryById(inquiryId);

        if (userRole != Role.CLIENT && userRole != Role.ADMIN) {
            throw new BusinessException(
                    "Only the client can express a vendor preference",
                    "ACCESS_DENIED");
        }

        if (inquiry.getStatus() != EventStatus.PROPOSAL_SENT
                && inquiry.getStatus() != EventStatus.INQUIRY_SUBMITTED) {
            throw new BusinessException(
                    String.format("Cannot record preference in status: %s", inquiry.getStatus()),
                    "INVALID_STATE");
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

    // ============ PROPOSAL BUILDER ============

    private String buildProposalJson(SendProposalRequest request, Inquiry inquiry) {
        try {
            Map<String, Object> proposal = new LinkedHashMap<>();

            proposal.put("proposalNumber", generateProposalNumber(inquiry));
            proposal.put("sentDate", LocalDateTime.now().toString());
            proposal.put("expiryDate", LocalDateTime.now().plusDays(7).toString());

            proposal.put("venue", request.getVenue());
            proposal.put("venueId", request.getVenueId());
            proposal.put("venueDetails", request.getVenueDetails());
            proposal.put("price", request.getPrice());
            proposal.put("terms", request.getTerms());
            proposal.put("categories", request.getCategories());
            proposal.put("pricingTier", request.getPricingTier() != null ?
                    request.getPricingTier() : "standard");
            proposal.put("vendorShortlist", request.getVendorShortlist());

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

    private String generateProposalNumber(Inquiry inquiry) {
        return String.format("AICC-P-%d-%03d",
                LocalDate.now().getYear(),
                inquiry.getId()
        );
    }

    private String getUserEmail(Long userId) {
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElse("client@example.com");
    }
}