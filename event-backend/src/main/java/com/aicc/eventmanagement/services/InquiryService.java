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
import com.aicc.eventmanagement.payload.ConversionPreviewResponse;
import com.aicc.eventmanagement.payload.ConvertToEventRequest;
import com.aicc.eventmanagement.payload.CreateInquiryRequest;
import com.aicc.eventmanagement.payload.SendProposalRequest;
import com.aicc.eventmanagement.payload.UpdateInquiryRequest;
import com.aicc.eventmanagement.util.CategoryUtils;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
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
    private final VendorRankingService rankingService;
    private final VendorAssignmentRepository assignmentRepository;

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

        // Prevent deletion if inquiry has an associated event
        if (inquiry.getEvent() != null) {
            throw new RuntimeException("Cannot delete inquiry with associated event. Delete the event first.");
        }

        inquiryRepository.delete(inquiry);
    }

    // ============================================================
    // UPDATED STATUS TRANSITION METHOD WITH WORKFLOW ENGINE
    // ============================================================
    @Transactional
    public Inquiry updateInquiryStatus(Long id, EventStatus newStatus, Role userRole) {
        Inquiry inquiry = getInquiryById(id);
        EventStatus oldStatus = inquiry.getStatus();

        // Use the WorkflowEngine to validate transition and role
        workflowEngine.validateTransition(oldStatus, newStatus, userRole);

        // If validation passes, update the status
        inquiry.setStatus(newStatus);
        Inquiry saved = inquiryRepository.save(inquiry);

        // Publish the existing status change event
        eventPublisher.publishEvent(new InquiryStatusChangedEvent(this, saved, oldStatus, newStatus));

        // Publish the new workflow transition event (for logging / Sep 9 deliverable)
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

    // ============================================================
    // UPDATED CONVERT TO EVENT WITH WORKFLOW ENGINE
    // ============================================================
    @Transactional
    public Event convertToEvent(Long inquiryId, ConvertToEventRequest request) {
        Inquiry inquiry = getInquiryById(inquiryId);

        // Precondition: inquiry must be in PROPOSAL_ACCEPTED state
        if (inquiry.getStatus() != EventStatus.PROPOSAL_ACCEPTED) {
            throw new RuntimeException(String.format("Only accepted proposals can be converted to events. Current status: %s", inquiry.getStatus()));
        }

        if (inquiry.getEvent() != null) {
            throw new RuntimeException("This inquiry already has an event associated.");
        }

        // Build the event
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

        // Book the venue on a best-effort basis. The proposal's venueId may have
        // been taken by another event between proposal and convert (stale read).
        // A VENUE_CONFLICT must not abort the whole conversion — the event,
        // vendors and checklist are the critical path; the coordinator can
        // re-assign a free venue afterwards via PUT /events/{id}.
        if (request.getVenueId() != null) {
            try {
                if (!venueService.isVenueAvailable(request.getVenueId(), inquiry.getEventDate())) {
                    throw new BusinessException(
                            String.format("Venue is already booked on %s — converting without a venue booking",
                                    inquiry.getEventDate()),
                            "VENUE_CONFLICT");
                }
                venueService.bookVenue(
                        request.getVenueId(),
                        savedEvent.getId(),
                        inquiry.getEventDate()
                );
                log.info("Venue {} booked for event {} on {}",
                        request.getVenueId(), savedEvent.getId(), inquiry.getEventDate());
            } catch (BusinessException e) {
                if (!"VENUE_CONFLICT".equals(e.getErrorCode())) {
                    throw e;
                }
                log.warn("Convert {} proceeding without venue booking (venueId={}): {}",
                        inquiryId, request.getVenueId(), e.getMessage());
                // Keep the venue display name for context, but drop the hard
                // booking reference so the event does not point at a venue
                // booked by someone else.
                savedEvent.setVenueId(null);
                eventRepository.save(savedEvent);
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
                Role.COORDINATOR      // As per actionRoles, this should be COORDINATOR
        );

        // Update inquiry status and link to event
        inquiry.setStatus(EventStatus.EVENT_CREATED);
        inquiry.setEvent(savedEvent);
        inquiryRepository.save(inquiry);

        // Publish event creation event
        eventPublisher.publishEvent(new EventCreatedEvent(this, savedEvent));

        // Also publish a workflow transition event for logging
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

    // ============================================================
    // CONVERSION PREVIEW (dry run of automatic assignment)
    // ============================================================
    @Transactional(readOnly = true)
    public ConversionPreviewResponse previewConversion(Long inquiryId) {
        Inquiry inquiry = getInquiryById(inquiryId);

        if (inquiry.getStatus() != EventStatus.PROPOSAL_ACCEPTED) {
            throw new BusinessException(
                "Only accepted proposals can be previewed for conversion. Current status: " + inquiry.getStatus(),
                "INVALID_STATE");
        }

        if (inquiry.getEvent() != null) {
            throw new BusinessException(
                "This inquiry already has an event associated.",
                "ALREADY_CONVERTED");
        }

        List<String> requiredCategories = resolvePreviewCategories(inquiry);
        LocalDate eventDate = inquiry.getEventDate();

        ConversionPreviewResponse.VenuePreview venuePreview = buildVenuePreview(inquiry, eventDate);

        List<ConversionPreviewResponse.CategoryPreview> categoryPreviews = new ArrayList<>();
        for (String category : requiredCategories) {
            List<VendorRankingService.Ranked> ranked =
                rankingService.rank(category, eventDate, Set.of());

            List<ConversionPreviewResponse.VendorCandidate> candidates = new ArrayList<>();
            for (int i = 0; i < Math.min(3, ranked.size()); i++) {
                VendorRankingService.Ranked r = ranked.get(i);
                var v = r.vendor();
                boolean hasDeclined = hasRecentDecline(v.getId(), category);
                long load = assignmentRepository.countActiveAndPendingByVendor(v.getId());

                candidates.add(ConversionPreviewResponse.VendorCandidate.builder()
                    .vendorId(v.getId())
                    .companyName(v.getCompanyName())
                    .rating(v.getRating())
                    .currentLoad(load)
                    .score(r.score())
                    .rank(i + 1)
                    .hasRecentDecline(hasDeclined)
                    .build());
            }

            String warning = null;
            if (candidates.isEmpty()) {
                warning = "No eligible vendors available for this category on " + eventDate;
            } else if (candidates.get(0).isHasRecentDecline()) {
                warning = "Top-ranked vendor has declined a similar offer in the last 30 days";
            }

            categoryPreviews.add(ConversionPreviewResponse.CategoryPreview.builder()
                .category(category)
                .candidates(candidates)
                .warning(warning)
                .build());
        }

        String timeline = "Vendors typically respond within 2 days. "
            + "Event should reach Confirmed within 5 days if all vendors accept.";

        return ConversionPreviewResponse.builder()
            .inquiryId(inquiryId)
            .eventType(inquiry.getEventType())
            .eventDate(eventDate)
            .expectedAttendees(inquiry.getExpectedAttendees())
            .requiredCategories(requiredCategories)
            .venue(venuePreview)
            .categories(categoryPreviews)
            .timelineEstimate(timeline)
            .build();
    }

    private List<String> resolvePreviewCategories(Inquiry inquiry) {
        if (inquiry.getCategories() != null && !inquiry.getCategories().isBlank()) {
            return CategoryUtils.split(inquiry.getCategories());
        }
        if (inquiry.getRequestedCategories() != null && !inquiry.getRequestedCategories().isBlank()) {
            return CategoryUtils.split(inquiry.getRequestedCategories());
        }
        return CategoryUtils.EVENT_TYPE_DEFAULTS.getOrDefault(inquiry.getEventType(), List.of());
    }

    private ConversionPreviewResponse.VenuePreview buildVenuePreview(Inquiry inquiry, LocalDate eventDate) {
        if (inquiry.getProposal() == null || inquiry.getProposal().isBlank()) {
            return ConversionPreviewResponse.VenuePreview.builder()
                .available(false)
                .message("No proposal attached to this inquiry")
                .build();
        }

        try {
            Map<String, Object> proposal = objectMapper.readValue(
                inquiry.getProposal(), new TypeReference<>() {});

            Long venueId = proposal.get("venueId") != null
                ? ((Number) proposal.get("venueId")).longValue() : null;
            String venueName = (String) proposal.get("venue");

            if (venueId == null) {
                return ConversionPreviewResponse.VenuePreview.builder()
                    .venueName(venueName)
                    .available(false)
                    .message("No specific venue selected in proposal")
                    .build();
            }

            boolean available = venueService.isVenueAvailable(venueId, eventDate);
            String message = available
                ? "Available on " + eventDate
                : "Already booked on " + eventDate;

            return ConversionPreviewResponse.VenuePreview.builder()
                .venueId(venueId)
                .venueName(venueName)
                .available(available)
                .message(message)
                .build();

        } catch (Exception e) {
            log.warn("Failed to build venue preview for inquiry {}: {}",
                inquiry.getId(), e.getMessage());
            return ConversionPreviewResponse.VenuePreview.builder()
                .available(false)
                .message("Could not parse proposal venue details")
                .build();
        }
    }

    private boolean hasRecentDecline(Long vendorId, String category) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        return assignmentRepository.existsRecentDeclineByVendorAndCategory(
            vendorId, category, cutoff);
    }

    // ============================================================
    // OLD VALIDATION METHOD REMOVED – replaced by WorkflowEngine
    // ============================================================
    // private boolean isValidTransition(EventStatus from, EventStatus to) { ... }  // DELETED

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

    // ============================================================
    // PROPOSAL MANAGEMENT METHODS
    // ============================================================

    @Transactional
    public Inquiry sendProposal(Long id, SendProposalRequest request, Role userRole) {
        Inquiry inquiry = getInquiryById(id);

        // 1. Validate state – must be INQUIRY_SUBMITTED
        if (inquiry.getStatus() != EventStatus.INQUIRY_SUBMITTED) {
            throw new BusinessException(
                    String.format("Cannot send proposal. Inquiry status is: %s (expected: INQUIRY_SUBMITTED)",
                            inquiry.getStatus()),
                    "INVALID_STATE"
            );
        }

        // 2. Validate via WorkflowEngine
        workflowEngine.validateTransition(
                inquiry.getStatus(),
                EventStatus.PROPOSAL_SENT,
                userRole
        );

        // 3. Build the proposal JSON with all details
        String proposalJson = buildProposalJson(request, inquiry);

        // 4. Store proposal, keep a live agreed category set, and update status
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

        // 5. Publish events
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

        // 6. Send email notification to client
        try {
            String clientEmail = getUserEmail(inquiry.getClientId());
            emailService.sendProposalNotification(inquiry, clientEmail);
            log.info("📧 Proposal notification sent to client: {}", clientEmail);
        } catch (Exception e) {
            log.warn("Failed to send proposal email: {}", e.getMessage());
            // Don't fail the whole operation – proposal was still saved
        }

        log.info("✅ Proposal sent for inquiry {} by {}", id, userRole);
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

        // Validate that client can reject
        workflowEngine.validateTransition(
                inquiry.getStatus(),
                EventStatus.PROPOSAL_REJECTED,
                userRole
        );

        inquiry.setStatus(EventStatus.PROPOSAL_REJECTED);

        // Store rejection reason in requirements
        if (reason != null) {
            String currentReqs = inquiry.getRequirements();
            inquiry.setRequirements(
                    (currentReqs != null ? currentReqs + "\n" : "") +
                            "Proposal rejected on " + LocalDateTime.now() + ": " + reason
            );
        }

        Inquiry saved = inquiryRepository.save(inquiry);

        // Publish workflow transition event
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

    // ============ PROPOSAL BUILDER ============

    /**
     * Build a complete proposal JSON with all details including auto-generated fields.
     */
    private String buildProposalJson(SendProposalRequest request, Inquiry inquiry) {
        try {
            Map<String, Object> proposal = new LinkedHashMap<>();

            // Auto-generated fields
            proposal.put("proposalNumber", generateProposalNumber(inquiry));
            proposal.put("sentDate", LocalDateTime.now().toString());
            proposal.put("expiryDate", LocalDateTime.now().plusDays(7).toString());

            // From request
            proposal.put("venue", request.getVenue());
            proposal.put("venueId", request.getVenueId());
            proposal.put("venueDetails", request.getVenueDetails());
            proposal.put("price", request.getPrice());
            proposal.put("terms", request.getTerms());
            proposal.put("categories", request.getCategories());
            proposal.put("pricingTier", request.getPricingTier() != null ?
                    request.getPricingTier() : "standard");
            proposal.put("vendorShortlist", request.getVendorShortlist());

            // Client info (for context)
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

    /**
     * Generate a unique proposal number.
     * Format: AICC-P-2026-001
     */
    private String generateProposalNumber(Inquiry inquiry) {
        return String.format("AICC-P-%d-%03d",
                LocalDate.now().getYear(),
                inquiry.getId()
        );
    }

    /**
     * Get the email address for a user by their ID.
     */
    private String getUserEmail(Long userId) {
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElse("client@example.com"); // Fallback for demo
    }
}