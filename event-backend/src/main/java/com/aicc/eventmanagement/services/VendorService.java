
package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.AppNotification.Destination;
import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorBookedDate;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.SelectionReason;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.events.VendorAssignmentEvent;
import com.aicc.eventmanagement.events.WorkflowTransitionEvent;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.CreateVendorRequest;
import com.aicc.eventmanagement.payload.UpdateVendorRequest;
import com.aicc.eventmanagement.payload.VendorDecisionPreviewResponse;
import com.aicc.eventmanagement.payload.VendorPerformanceResponse;
import com.aicc.eventmanagement.payload.VendorReviewResponse;
import com.aicc.eventmanagement.payload.VendorTrailResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.aicc.eventmanagement.util.CategoryUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.lang.Nullable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VendorService {

    private static final int MAX_RANKED_BACKUPS = 3;

    private final VendorRepository vendorRepository;
    private final VendorBookedDateRepository bookedDateRepository;
    private final VendorAssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final WorkflowEngine workflowEngine;
    private final VendorRankingService rankingService;
    private final VendorEligibilityService eligibilityService;
    private final VendorRatingService ratingService;
    private final NotificationService notifications;
    private final AutomaticAssistance assistance;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Vendor createVendor(CreateVendorRequest req) {
        if (userRepository.existsByUsername(req.getUsername()))
            throw new BusinessException("Username taken", "USERNAME_TAKEN");
        if (userRepository.existsByEmail(req.getEmail()))
            throw new BusinessException("Email taken", "EMAIL_TAKEN");

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName() != null ? req.getFullName() : req.getCompanyName())
                .phone(req.getPhone())
                .role(Role.VENDOR)
                .isActive(true)
                .build();
        userRepository.save(user);

        Vendor vendor = Vendor.builder()
                .userId(user.getId())
                .companyName(req.getCompanyName())
                .serviceCategory(requireKnownCategory(req.getServiceCategory()))
                .description(req.getDescription())
                .phone(req.getPhone())
                .email(req.getEmail())
                .rating(0.0)
                .insuranceExpiryDate(req.getInsuranceExpiryDate())
                .isActive(true)
                .build();
        return vendorRepository.save(vendor);
    }

    @Transactional
    public Vendor applyForOnboarding(com.aicc.eventmanagement.payload.VendorApplyRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BusinessException("Email already registered", "EMAIL_TAKEN");
        }

        String username = uniqueUsernameFromEmail(req.getEmail());

        StringBuilder description = new StringBuilder(req.getDescription().trim());
        if (req.getWebsite() != null && !req.getWebsite().isBlank()) {
            description.append("\nWebsite: ").append(req.getWebsite().trim());
        }
        if (req.getEstablishedYear() != null) {
            description.append("\nEstablished: ").append(req.getEstablishedYear());
        }

        User user = User.builder()
                .username(username)
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getContactPerson())
                .phone(req.getPhone())
                .role(Role.VENDOR)
                .isActive(false)
                .build();
        userRepository.save(user);

        Vendor vendor = Vendor.builder()
                .userId(user.getId())
                .companyName(req.getCompanyName())
                .serviceCategory(requireKnownCategory(req.getServiceCategory()))
                .description(description.toString())
                .phone(req.getPhone())
                .email(req.getEmail())
                .rating(0.0)
                .isActive(false)
                .build();
        log.info("Vendor application received for company={} username={}", req.getCompanyName(), username);
        return vendorRepository.save(vendor);
    }

    private String uniqueUsernameFromEmail(String email) {
        int at = email.indexOf('@');
        String local = (at > 0 ? email.substring(0, at) : email).replaceAll("[^a-zA-Z0-9._-]", "");
        if (local.length() < 3) {
            local = "vendor";
        }
        if (local.length() > 40) {
            local = local.substring(0, 40);
        }
        String username = local;
        int n = 1;
        while (Boolean.TRUE.equals(userRepository.existsByUsername(username))) {
            username = local + n++;
        }
        return username;
    }

    private String requireKnownCategory(String category) {
        String canonical = CategoryUtils.canonicalize(category);
        if (!CategoryUtils.isKnownCategory(canonical)) {
            throw new BusinessException("Unsupported vendor service category", "VENDOR_CATEGORY_MISMATCH");
        }
        return canonical;
    }

    @Transactional
    public Vendor updateVendor(Long id, UpdateVendorRequest req) {
        Vendor vendor = getVendorById(id);

        if (req.getCompanyName() != null)      vendor.setCompanyName(req.getCompanyName());
        if (req.getServiceCategory() != null)  vendor.setServiceCategory(requireKnownCategory(req.getServiceCategory()));
        if (req.getDescription() != null)      vendor.setDescription(req.getDescription());
        if (req.getPhone() != null)            vendor.setPhone(req.getPhone());
        if (req.getEmail() != null)            vendor.setEmail(req.getEmail());
        if (req.getActive() != null)           vendor.setActive(req.getActive());
        if (req.isInsuranceExpiryDateProvided()) vendor.setInsuranceExpiryDate(req.getInsuranceExpiryDate());

        log.info("Updated vendor {}", id);
        return vendorRepository.save(vendor);
    }

    @Transactional
    public Vendor toggleActive(Long id) {
        Vendor vendor = getVendorById(id);
        vendor.setActive(!vendor.isActive());

        if (vendor.getUserId() != null) {
            userRepository.findById(vendor.getUserId()).ifPresent(u -> {
                u.setActive(vendor.isActive());
                userRepository.save(u);
            });
        }

        log.info("Toggled vendor {} active -> {}", id, vendor.isActive());
        return vendorRepository.save(vendor);
    }

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.vendor.offer-expiry-hours:72}")
    private long offerExpiryHours;

    private LocalDateTime offerDeadline() {
        return LocalDateTime.now().plusHours(offerExpiryHours);
    }

    private List<CategoryEscalation> buildEscalations(Event event) {
        List<String> requiredCategories = requiredCategoriesFor(event);

        if (requiredCategories.isEmpty()) {
            return List.of();
        }

        List<VendorAssignment> all = assignmentRepository.findByEventId(event.getId());

        return requiredCategories.stream()
                .map(category -> new CategoryEscalation(
                        event.getId(),
                        category,
                        all.stream()
                                .filter(a -> category.equals(a.getServiceCategory()))
                                .sorted(Comparator.comparing(VendorAssignment::getId))
                                .toList()))
                .toList();
    }

    public CategoryEscalation escalationFor(Event event, String category) {
        List<VendorAssignment> attempts = assignmentRepository
                .findByEventIdAndServiceCategory(event.getId(), category).stream()
                .sorted(Comparator.comparing(VendorAssignment::getId))
                .toList();
        return new CategoryEscalation(event.getId(), category, attempts);
    }

    private List<String> requiredCategoriesFor(Event event) {
        String stored = event.getRequiredCategories();
        List<String> selected = stored != null && !stored.isBlank()
                ? CategoryUtils.split(stored)
                : List.of();
        return CategoryUtils.externalVendorCategories(event.getInquiry().getEventType(), selected);
    }

    public List<Vendor> getAllVendors() {
        return vendorRepository.findAll();
    }

    public List<Vendor> getActiveVendors() {
        return vendorRepository.findByIsActive(true);
    }

    public Vendor getVendorById(Long id) {
        return vendorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Vendor", id));
    }

    public List<Vendor> getVendorsByCategory(String category) {
        return vendorRepository.findByServiceCategory(category);
    }

    public List<Vendor> searchVendorsByName(String name) {
        return vendorRepository.findActiveByCompanyNameContaining(name);
    }

    public List<Vendor> findAvailableVendors(String category, LocalDate date) {
        return findAvailableVendors(category, date, null);
    }

    public List<Vendor> findAvailableVendors(String category, LocalDate date, Long excludeVendorId) {
        return vendorRepository.findByServiceCategoryIn(CategoryUtils.categoryVariants(category)).stream()
                .filter(Vendor::isActive)
                .filter(v -> !v.getId().equals(excludeVendorId))
                .filter(v -> eligibilityService.evaluate(v, category, date, null, null, Set.of()).eligible())
                .collect(Collectors.toList());
    }

    public boolean isVendorAvailable(Long vendorId, LocalDate date) {
        Vendor vendor = getVendorById(vendorId);
        return eligibilityService.evaluate(vendor, vendor.getServiceCategory(), date, null, null, Set.of()).eligible();
    }

    public boolean isVendorAvailableForEvent(Long vendorId, LocalDate date, Long eventId) {
        Vendor vendor = getVendorById(vendorId);
        Event event = eventRepository.findById(eventId).orElse(null);
        String eventType = event == null ? null : event.getInquiry().getEventType();
        return eligibilityService.evaluate(vendor, vendor.getServiceCategory(), date, eventId, eventType, Set.of()).eligible();
    }

    @Transactional
    public void addBookedDate(Long vendorId, LocalDate date) {
        Vendor vendor = getVendorById(vendorId);

        if (bookedDateRepository.existsByVendorIdAndBookedDate(vendorId, date)) {
            throw new BusinessException(
                    String.format("Vendor %s already has a booked date on %s", vendor.getCompanyName(), date),
                    "BOOKED_DATE_EXISTS"
            );
        }

        VendorBookedDate bookedDate = VendorBookedDate.builder()
                .vendor(vendor)
                .bookedDate(date)
                .build();

        bookedDateRepository.save(bookedDate);
        log.info("Added booked date {} for vendor {}", date, vendor.getCompanyName());
    }

    @Transactional
    public void removeBookedDate(Long vendorId, LocalDate date) {
        VendorBookedDate bookedDate = bookedDateRepository
                .findByVendorIdAndDate(vendorId, date);

        if (bookedDate == null) {
            throw new EntityNotFoundException("Booked date not found for vendor " + vendorId + " on " + date);
        }

        bookedDateRepository.delete(bookedDate);
        log.info("Removed booked date {} for vendor {}", date, vendorId);
    }

    public List<VendorAssignment> autoAssignForEvent(Long eventId) {
        Event event = lockEvent(eventId);

        return autoAssignForEvent(event);
    }

    public List<VendorAssignment> autoAssignForEvent(Event event) {
        ensureEventAcceptsAssignments(event);
        String eventType = event.getInquiry().getEventType();
        LocalDate eventDate = event.getInquiry().getEventDate();

        List<String> requiredCategories = requiredCategoriesFor(event);

        if (requiredCategories.isEmpty()) {
            log.warn("No category mapping found for event type: {}", eventType);
            return List.of();
        }

        log.info("Auto-assigning {} categories for event {} (type: {})",
                requiredCategories.size(), event.getId(), eventType);

        List<Long> preferredVendorIds = parsePreferredVendors(event.getInquiry());

        List<VendorAssignment> assignments = new ArrayList<>();

        for (String category : requiredCategories) {
            if (!escalationFor(event, category).attempts().isEmpty()) continue;
            VendorAssignment assignment = null;
            Set<Long> alreadyTried = Set.copyOf(
                    assignmentRepository.findTriedVendorIds(event.getId(), category));

            if (!preferredVendorIds.isEmpty()) {
                List<Map<String, Object>> excludedPreferences = new ArrayList<>();
                for (Long vendorId : preferredVendorIds) {
                    Optional<Vendor> prefVendor = vendorId == null
                            ? Optional.empty()
                            : vendorRepository.findById(vendorId);
                    Vendor candidate = prefVendor.orElse(null);
                    VendorEligibilityService.EligibilityResult eligibility = eligibilityService.evaluate(
                            candidate, category, eventDate, event.getId(), eventType, alreadyTried);
                    if (!eligibility.eligible()) {
                        excludedPreferences.add(excludedPreference(vendorId, candidate, eligibility.reason()));
                        continue;
                    }

                    if (candidate != null) {
                        assignment = VendorAssignment.builder()
                                .event(event)
                                .vendor(candidate)
                                .vendorName(candidate.getCompanyName())
                                .serviceCategory(category)
                                .status(VendorAssignmentStatus.PENDING)
                                .selectionReason(SelectionReason.CLIENT_PREFERRED)
                                .decisionSnapshot(buildClientPreferredSnapshot(
                                        category, eventDate, candidate, excludedPreferences))
                                .assignedAt(LocalDateTime.now())
                                .expiresAt(offerDeadline())
                                .build();
                        log.info("Using CLIENT-PREFERRED vendor {} for category {} on event {}",
                                candidate.getCompanyName(), category, event.getId());
                        break;
                    }
                }
            }

            if (assignment == null) {
                Optional<VendorRankingService.Selection> selection =
                        rankingService.selectForEvent(event.getId(), eventType, category, eventDate);

                if (selection.isPresent()) {
                    VendorRankingService.Selection s = selection.get();
                    assignment = VendorAssignment.builder()
                            .event(event)
                            .vendor(s.vendor())
                            .vendorName(s.vendor().getCompanyName())
                            .serviceCategory(category)
                            .status(VendorAssignmentStatus.PENDING)
                            .rankingScore(s.score())
                            .selectionReason(s.reason())
                            .decisionSnapshot(s.reasoning())
                            .assignedAt(LocalDateTime.now())
                            .expiresAt(offerDeadline())
                            .build();
                    log.info("Auto-assigned {} to event {} for category {} (score {}, reason {})",
                            s.vendor().getCompanyName(), event.getId(), category,
                            s.score(), s.reason());
                }
            }

            if (assignment != null) {
                assignments.add(assignment);
                clearCoordinatorAction(event, category);
            } else {
                flagCoordinatorAction(event, category, "No eligible vendor was available for the initial offer.");
                log.warn("No vendor available for category {} on date {} for event {}",
                        category, eventDate, event.getId());
            }
        }

        List<VendorAssignment> saved = new ArrayList<>();
        if (!assignments.isEmpty()) {
            saved = assignmentRepository.saveAll(assignments);
            saved.forEach(a -> eventPublisher.publishEvent(new VendorAssignmentEvent(this, a)));
        }

        eventRepository.save(event);
        evaluateEventRollup(event, Role.COORDINATOR);

        return saved;
    }

    private void requireEligible(Vendor vendor, Event event, String category, Set<Long> excludedVendorIds) {
        ensureEventAcceptsAssignments(event);
        VendorEligibilityService.EligibilityResult result = eligibilityService.evaluate(
                vendor, category, event.getInquiry().getEventDate(), event.getId(),
                event.getInquiry().getEventType(), excludedVendorIds);
        if (!result.eligible()) {
            throw new BusinessException(result.reason(), result.code());
        }
    }

    private void ensureEventAcceptsAssignments(Event event) {
        EventStatus status = event.getStatus();
        if (status == EventStatus.CONFIRMED || status == EventStatus.COMPLETED
                || status == EventStatus.CANCELLED || status == EventStatus.CLOSED) {
            throw new BusinessException("Cannot change vendor assignments for a confirmed or closed event", "EVENT_NOT_OPEN");
        }
    }

    private String requireCoordinatorReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("A reason is required for coordinator assignments", "COORDINATOR_REASON_REQUIRED");
        }
        String normalized = reason.trim();
        if (normalized.length() > 500) {
            throw new BusinessException("Coordinator assignment reason cannot exceed 500 characters", "INVALID_REASON");
        }
        return normalized;
    }

    private String buildCoordinatorDecisionSnapshot(String category, LocalDate eventDate, Vendor vendor,
                                                    String reason, Long actorId, String actorUsername,
                                                    SelectionReason selectionReason) {
        Map<String, Object> selected = new LinkedHashMap<>();
        selected.put("vendorId", vendor.getId());
        selected.put("vendorName", vendor.getCompanyName());
        selected.put("score", null);
        selected.put("rank", null);
        selected.put("status", "Selected");
        selected.put("reason", reason);

        Map<String, Object> actor = new LinkedHashMap<>();
        actor.put("userId", actorId);
        actor.put("username", actorUsername);

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("category", category);
        snapshot.put("eventDate", eventDate == null ? null : eventDate.toString());
        snapshot.put("selectedVendorId", vendor.getId());
        snapshot.put("selectedVendorName", vendor.getCompanyName());
        snapshot.put("selectionReason", selectionReason.name());
        snapshot.put("reasoning", reason);
        snapshot.put("actor", actor);
        snapshot.put("considered", List.of(selected));
        snapshot.put("excluded", List.of());

        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize coordinator assignment snapshot", e);
        }
    }

    private Map<String, Object> excludedPreference(Long vendorId, Vendor vendor, String reason) {
        Map<String, Object> excluded = new LinkedHashMap<>();
        excluded.put("vendorId", vendorId);
        excluded.put("vendorName", vendor != null ? vendor.getCompanyName() : null);
        excluded.put("score", null);
        excluded.put("status", "Unavailable");
        excluded.put("reason", reason);
        return excluded;
    }

    private String buildClientPreferredSnapshot(String category, LocalDate eventDate, Vendor selected,
                                                List<Map<String, Object>> excluded) {
        Map<String, Object> selectedCandidate = new LinkedHashMap<>();
        selectedCandidate.put("vendorId", selected.getId());
        selectedCandidate.put("vendorName", selected.getCompanyName());
        selectedCandidate.put("score", null);
        selectedCandidate.put("rank", null);
        selectedCandidate.put("status", "Selected");
        selectedCandidate.put("reason", "Selected from the client's preferred vendor list");

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("category", category);
        snapshot.put("eventDate", eventDate.toString());
        snapshot.put("selectedVendorId", selected.getId());
        snapshot.put("selectedVendorName", selected.getCompanyName());
        snapshot.put("selectionReason", SelectionReason.CLIENT_PREFERRED.name());
        snapshot.put("reasoning", "Selected from the client's preferred vendor list");
        snapshot.put("considered", List.of(selectedCandidate));
        snapshot.put("excluded", excluded);

        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize preferred vendor decision snapshot", e);
        }
    }

    private List<Long> parsePreferredVendors(Inquiry inquiry) {
        if (inquiry.getPreferredVendorIds() == null || inquiry.getPreferredVendorIds().isBlank()) {
            return List.of();
        }
        try {
            List<Long> parsed = objectMapper.readValue(
                    inquiry.getPreferredVendorIds(), new TypeReference<List<Long>>() {});
            return parsed == null ? List.of() : parsed;
        } catch (Exception e) {
            log.warn("Failed to parse preferred vendors for inquiry {}: {}", inquiry.getId(), e.getMessage());
            return List.of();
        }
    }

    @Transactional
    public VendorAssignment manualAssign(Long eventId, String category, Long vendorId) {
        return manualAssign(eventId, category, vendorId, "Coordinator manual assignment", null, null, null);
    }

    public VendorAssignment manualAssign(Long eventId, String category, Long vendorId,
                                         String reason, String serviceOrder, Long coordinatorId, String coordinatorUsername) {
        Event event = lockEvent(eventId);

        Vendor vendor = getVendorById(vendorId);
        LocalDate eventDate = event.getInquiry().getEventDate();
        requireEligible(vendor, event, category,
                Set.copyOf(assignmentRepository.findTriedVendorIds(eventId, category)));
        String normalizedReason = requireCoordinatorReason(reason);

        CategoryEscalation escalation = escalationFor(event, category);

        if (escalation.isResolved()) {
            throw new BusinessException(
                    String.format("Category '%s' is already filled for this event", category),
                    "CATEGORY_ALREADY_ASSIGNED"
            );
        }

        if (escalation.isPending()) {
            throw new BusinessException(
                    String.format("Category '%s' already has an offer awaiting a response", category),
                    "CATEGORY_OFFER_OUTSTANDING"
            );
        }

        escalation.currentAttempt()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.OPEN)
                .ifPresent(open -> {
                    workflowEngine.validateAssignmentTransition(
                            VendorAssignmentStatus.OPEN, VendorAssignmentStatus.CANCELLED, Role.COORDINATOR);
                    open.setStatus(VendorAssignmentStatus.CANCELLED);
                    assignmentRepository.save(open);
                    log.info("Cancelled open pool row {} superseded by manual assignment", open.getId());
                });

        VendorAssignment assignment = VendorAssignment.builder()
                .event(event)
                .vendor(vendor)
                .vendorName(vendor.getCompanyName())
                .serviceCategory(category)
                .status(VendorAssignmentStatus.PENDING)
                .selectionReason(SelectionReason.COORDINATOR_MANUAL)
                .decisionSnapshot(buildCoordinatorDecisionSnapshot(
                        category, eventDate, vendor, normalizedReason, coordinatorId, coordinatorUsername,
                        SelectionReason.COORDINATOR_MANUAL))
                .serviceOrder(serviceOrder)
                .assignedAt(LocalDateTime.now())
                .expiresAt(offerDeadline())
                .build();

        VendorAssignment saved = assignmentRepository.save(assignment);

        eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));

        clearCoordinatorAction(event, category);
        eventRepository.save(event);
        evaluateEventRollup(event, Role.COORDINATOR);
        log.info("Manual assignment: {} for event {} category {}",
                vendor.getCompanyName(), eventId, category);

        return saved;
    }

    // ============ VENDOR RESPONSE ============

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public VendorAssignment respondToAssignment(Long assignmentId, String response, String declineReason) {
        Long eventId = assignmentRepository.findEventIdForAssignment(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));
        lockEvent(eventId);
        VendorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));

        if (assignment.getStatus() != VendorAssignmentStatus.PENDING) {
            throw new BusinessException(
                    String.format("Assignment is not pending (current status: %s)", assignment.getStatus()),
                    "ASSIGNMENT_NOT_PENDING"
            );
        }

        if (assignment.getExpiresAt() != null && !assignment.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new BusinessException("This offer has passed its response deadline", "OFFER_EXPIRED");
        }

        LocalDate eventDate = assignment.getEvent().getInquiry().getEventDate();
        boolean accepted = "ACCEPTED".equalsIgnoreCase(response);
        boolean declined = "DECLINED".equalsIgnoreCase(response);

        if (!accepted && !declined) {
            throw new BusinessException(
                    "Invalid response. Must be 'ACCEPTED' or 'DECLINED'",
                    "INVALID_RESPONSE"
            );
        }

        if (accepted) {
            VendorEligibilityService.EligibilityResult eligibility = eligibilityService.evaluate(
                    assignment.getVendor(), assignment.getServiceCategory(), eventDate,
                    assignment.getEvent().getId(), assignment.getEvent().getInquiry().getEventType(),
                    Set.copyOf(assignmentRepository.findDeclinedVendorIds(
                            assignment.getEvent().getId(), assignment.getServiceCategory())));
            if (!eligibility.eligible()) {
                throw new BusinessException(
                        eligibility.reason(), eligibility.code()
                );
            }
            workflowEngine.validateAssignmentTransition(
                    VendorAssignmentStatus.PENDING, VendorAssignmentStatus.ACCEPTED, Role.VENDOR);
            assignment.setStatus(VendorAssignmentStatus.ACCEPTED);
            assignment.setRespondedAt(LocalDateTime.now());
            VendorAssignment saved = assignmentRepository.save(assignment);
            eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));
            evaluateEventRollup(assignment.getEvent(), Role.VENDOR);
            return saved;
        }

        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.PENDING, VendorAssignmentStatus.DECLINED, Role.VENDOR);
        assignment.setStatus(VendorAssignmentStatus.DECLINED);
        assignment.setDeclineReason(declineReason);
        assignment.setRespondedAt(LocalDateTime.now());
        assignmentRepository.save(assignment);

        eventPublisher.publishEvent(new VendorAssignmentEvent(this, assignment));

        advanceAfterFailedAttempt(assignment, Role.VENDOR);
        evaluateEventRollup(assignment.getEvent(), Role.VENDOR);

        return assignment;
    }

    // ============ ADVANCE AFTER A FAILED ATTEMPT ============

    /** Try the next ranked candidate within the automatic offer limit. */
    @Transactional
    public void advanceAfterFailedAttempt(VendorAssignment failedAttempt, Role triggeringRole) {
        Event event = failedAttempt.getEvent();
        String category = failedAttempt.getServiceCategory();
        LocalDate eventDate = event.getInquiry().getEventDate();

        log.info("Advancing category {} for event {} after attempt {} ended as {}",
                category, event.getId(), failedAttempt.getId(), failedAttempt.getStatus());

        SelectionReason reason = failedAttempt.getSelectionReason();
        if (reason == SelectionReason.COORDINATOR_MANUAL || reason == SelectionReason.COORDINATOR_FORCED
                || reason == SelectionReason.POOL_CLAIM) {
            flagCoordinatorAction(event, category, "The follow-up offer ended without acceptance.");
            return;
        }

        if (assignmentRepository.findTriedVendorIds(event.getId(), category).size() >= 1 + MAX_RANKED_BACKUPS) {
            flagCoordinatorAction(event, category, "All three automatic backup offers ended without acceptance.");
            return;
        }

        Optional<VendorRankingService.Selection> selection =
                rankingService.selectForEvent(event.getId(), event.getInquiry().getEventType(), category, eventDate);

        if (selection.isEmpty()) {
            flagCoordinatorAction(event, category, "No eligible untried vendor was available.");
            return;
        }

        VendorRankingService.Selection s = selection.get();

        VendorAssignment newAssignment = VendorAssignment.builder()
                .event(event)
                .vendor(s.vendor())
                .vendorName(s.vendor().getCompanyName())
                .serviceCategory(category)
                .status(VendorAssignmentStatus.PENDING)
                .rankingScore(s.score())
                .selectionReason(s.reason())
                .decisionSnapshot(s.reasoning())
                .assignedAt(LocalDateTime.now())
                .expiresAt(offerDeadline())
                .build();

        VendorAssignment saved = assignmentRepository.save(newAssignment);

        eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));

        log.info("Reassigned {} to vendor {} for event {} (score {}, reason {})",
                category, s.vendor().getCompanyName(), event.getId(), s.score(), s.reason());
    }

    @Transactional
    public void autoReassign(VendorAssignment declinedAssignment) {
        advanceAfterFailedAttempt(declinedAssignment, Role.VENDOR);
    }

    private Event lockEvent(Long eventId) {
        return eventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));
    }

    private void clearCoordinatorAction(Event event, String category) {
        List<String> unfilled = new ArrayList<>(CategoryUtils.split(event.getUnfilledCategories()));
        if (unfilled.remove(category)) {
            event.setUnfilledCategories(unfilled.isEmpty() ? null : String.join(",", unfilled));
        }
    }

    private void flagCoordinatorAction(Event event, String category, String reason) {
        List<String> unfilled = new ArrayList<>(CategoryUtils.split(event.getUnfilledCategories()));
        if (unfilled.contains(category)) return;
        unfilled.add(category);
        assistance.record(event.getInquiry(), event.getId(), "VENDORS", "A service needs coordinator review",
                category + " · " + reason, true);
        event.setUnfilledCategories(String.join(",", unfilled));
        eventRepository.save(event);
        User coordinator = event.getInquiry().getCoordinator();
        if (coordinator != null) {
            notifications.notifyUser(coordinator.getId(), Destination.COORDINATOR_EVENT, event.getId(),
                    "Vendor service needs coordinator action", category + " for " + event.getName() + ". " + reason);
        }
    }

    // ============ OFFER EXPIRY ============

    /**
     * Expire offers whose deadline has passed and advance each category.
     *
     * Attributed to VENDOR because the cause is the vendor failing to act, the same
     * actor as a decline. That also keeps the resulting event rollup inside the roles
     * already permitted for AWAITING_VENDORS to NEEDS_COORDINATOR.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public int expireStaleOffers() {
        LocalDateTime now = LocalDateTime.now();
        List<VendorAssignmentRepository.DueOffer> stale = assignmentRepository.findExpiredPendingOffers(now);

        int expired = 0;

        for (VendorAssignmentRepository.DueOffer offer : stale) {
            lockEvent(offer.getEventId());
            VendorAssignment assignment = assignmentRepository.findById(offer.getId()).orElse(null);
            if (assignment == null || assignment.getStatus() != VendorAssignmentStatus.PENDING
                    || assignment.getExpiresAt() == null || assignment.getExpiresAt().isAfter(now)) continue;
            workflowEngine.validateAssignmentTransition(
                    VendorAssignmentStatus.PENDING, VendorAssignmentStatus.EXPIRED, Role.VENDOR);

            assignment.setStatus(VendorAssignmentStatus.EXPIRED);
            assignmentRepository.save(assignment);

            eventPublisher.publishEvent(new VendorAssignmentEvent(this, assignment));

            advanceAfterFailedAttempt(assignment, Role.VENDOR);
            evaluateEventRollup(assignment.getEvent(), Role.VENDOR);

            expired++;
            log.info("Expired assignment {} (vendor {}, category {}, deadline {})",
                    assignment.getId(),
                    assignment.getVendorName(),
                    assignment.getServiceCategory(),
                    assignment.getExpiresAt());
        }

        return expired;
    }

    @Transactional
    public void completeAssignmentsForEvent(Long eventId, Role triggeringRole) {
        List<VendorAssignment> assignments = assignmentRepository.findByEventId(eventId);
        int closed = 0;
        for (VendorAssignment a : assignments) {
            if (a.getStatus() == VendorAssignmentStatus.ACCEPTED) {
                workflowEngine.validateAssignmentTransition(
                        VendorAssignmentStatus.ACCEPTED, VendorAssignmentStatus.COMPLETED, triggeringRole);
                a.setStatus(VendorAssignmentStatus.COMPLETED);
                assignmentRepository.save(a);
                closed++;
            }
        }
        log.info("Completed {} accepted assignment(s) for event {}", closed, eventId);
    }

    @Transactional
    public void cancelAssignmentsForEvent(Long eventId, Role triggeringRole) {
        List<VendorAssignment> assignments = assignmentRepository.findByEventId(eventId);
        int cancelled = 0;
        for (VendorAssignment a : assignments) {
            VendorAssignmentStatus s = a.getStatus();
            if (s == VendorAssignmentStatus.ACCEPTED
                    || s == VendorAssignmentStatus.PENDING
                    || s == VendorAssignmentStatus.OPEN) {
                workflowEngine.validateAssignmentTransition(s, VendorAssignmentStatus.CANCELLED, triggeringRole);
                a.setStatus(VendorAssignmentStatus.CANCELLED);
                assignmentRepository.save(a);
                cancelled++;
            }
        }
        log.info("Cancelled {} assignment(s) for event {}", cancelled, eventId);
    }

    private void evaluateEventRollup(Event event, Role triggeringRole) {
        EventStatus current = event.getStatus();
        if (current == EventStatus.CONFIRMED
                || current == EventStatus.COMPLETED
                || current == EventStatus.CANCELLED
                || current == EventStatus.CLOSED) {
            return;
        }

        List<CategoryEscalation> escalations = buildEscalations(event);

        if (escalations.isEmpty()) {
            log.warn("Event {} has unknown event type '{}' - skipping rollup evaluation",
                    event.getId(), event.getInquiry().getEventType());
            return;
        }

        boolean anyExhausted = escalations.stream().anyMatch(CategoryEscalation::isExhausted);
        boolean allResolved = escalations.stream().allMatch(CategoryEscalation::isResolved);

        EventStatus target;
        if (anyExhausted) {
            target = EventStatus.NEEDS_COORDINATOR;
        } else if (allResolved) {
            target = EventStatus.CONFIRMED;
        } else {
            target = EventStatus.AWAITING_VENDORS;
        }

        if (current == target) {
            return;
        }

        workflowEngine.validateTransition(current, target, triggeringRole);
        event.setStatus(target);
        eventRepository.save(event);

        // Publish the rollup transition so the audit trail records it.
        eventPublisher.publishEvent(new WorkflowTransitionEvent(
                this,
                current,
                target,
                "EVENT-" + event.getId(),
                triggeringRole
        ));

        log.info("Event {} rollup: {} -> {} (anyExhausted={}, allResolved={}, triggeringRole={})",
                event.getId(), current, target, anyExhausted, allResolved, triggeringRole);
    }

    @Transactional
    public VendorAssignment claimOpenAssignment(Long assignmentId, Long vendorId) {
        VendorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));

        if (assignment.getStatus() != VendorAssignmentStatus.OPEN) {
            throw new BusinessException(
                    String.format("Assignment is not open (current status: %s)", assignment.getStatus()),
                    "ASSIGNMENT_NOT_OPEN");
        }

        EventStatus eventStatus = assignment.getEvent().getStatus();
        if (eventStatus == EventStatus.COMPLETED
                || eventStatus == EventStatus.CANCELLED
                || eventStatus == EventStatus.CLOSED) {
            throw new BusinessException(
                    "Cannot claim an assignment for a closed event",
                    "EVENT_NOT_OPEN");
        }

        Vendor vendor = getVendorById(vendorId);
        LocalDate eventDate = assignment.getEvent().getInquiry().getEventDate();
        requireEligible(vendor, assignment.getEvent(), assignment.getServiceCategory(),
                Set.copyOf(assignmentRepository.findTriedVendorIds(
                        assignment.getEvent().getId(), assignment.getServiceCategory())));

        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.OPEN, VendorAssignmentStatus.PENDING, Role.VENDOR);

        int rowsUpdated = assignmentRepository.claimOpenAssignment(
                assignmentId, vendorId, offerDeadline());
        if (rowsUpdated == 0) {
            throw new BusinessException(
                    "Assignment was claimed by another vendor",
                    "ASSIGNMENT_ALREADY_CLAIMED");
        }

        assignment = assignmentRepository.findById(assignmentId).orElseThrow();
        log.info("Vendor {} claimed open assignment {}", vendorId, assignmentId);
        evaluateEventRollup(assignment.getEvent(), Role.VENDOR);
        return assignment;
    }

    public List<VendorAssignment> getAssignmentsByEvent(Long eventId) {
        return assignmentRepository.findDetailedByEventId(eventId);
    }

    public List<VendorAssignment> getAssignmentsByVendor(Long vendorId) {
        return assignmentRepository.findByVendorId(vendorId);
    }

    @Transactional(readOnly = true)
    public VendorPerformanceResponse getVendorPerformance(Long vendorId) {
        Vendor vendor = getVendorById(vendorId);
        List<VendorAssignment> assignments = assignmentRepository.findByVendorId(vendorId);

        long completed = assignments.stream()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.COMPLETED)
                .count();
        long declined = assignments.stream()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.DECLINED)
                .count();
        long accepted = assignments.stream()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.ACCEPTED)
                .count();

        List<VendorReviewResponse> reviews = assignments.stream()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.COMPLETED && a.getVendorRating() != null)
                .sorted(Comparator.comparing(
                        VendorAssignment::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(VendorReviewResponse::from)
                .toList();
        double averageRating = ratingService.calculateVendorRating(vendor);

        return VendorPerformanceResponse.builder()
                .vendorId(vendor.getId())
                .companyName(vendor.getCompanyName())
                .averageRating(averageRating)
                .totalReviews(reviews.size())
                .completedAssignments(completed)
                .declinedAssignments(declined)
                .acceptedAssignments(accepted)
                .recentReviews(reviews.stream().limit(5).toList())
                .build();
    }

    @Transactional(readOnly = true)
    public List<VendorReviewResponse> getVendorReviews(Long vendorId) {
        getVendorById(vendorId);
        return assignmentRepository.findByVendorId(vendorId).stream()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.COMPLETED && a.getVendorRating() != null)
                .sorted(Comparator.comparing(
                        VendorAssignment::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(VendorReviewResponse::from)
                .toList();
    }

    public VendorAssignment getAssignmentById(Long id) {
        return assignmentRepository.findDetailedById(id)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", id));
    }

    @Transactional
    public VendorAssignment rateAssignment(Long assignmentId, Integer rating, String comment, Long clientId) {
        VendorAssignment assignment = getAssignmentById(assignmentId);
        if (!assignment.getEvent().getInquiry().getClientId().equals(clientId)) {
            throw new BusinessException("Not your event", "ACCESS_DENIED");
        }
        if (assignment.getStatus() != VendorAssignmentStatus.COMPLETED) {
            throw new BusinessException(
                    "Can only rate completed assignments", "INVALID_STATE");
        }

        assignment.setVendorRating(rating.doubleValue());
        assignment.setVendorRatingComment(comment);
        VendorAssignment saved = assignmentRepository.save(assignment);

        Vendor vendor = assignment.getVendor();
        double average = ratingService.calculateVendorRating(vendor);
        vendor.setRating(average);
        vendorRepository.save(vendor);
        return saved;
    }

    public List<VendorAssignment> getPendingAssignmentsForVendor(Long vendorId) {
        return assignmentRepository.findByVendorIdAndStatus(vendorId, VendorAssignmentStatus.PENDING);
    }

    @Transactional
    public int requestVendorReconfirmationForEventDateChange(Long eventId) {
        List<VendorAssignment> assignments = assignmentRepository.findByEventId(eventId);
        LocalDateTime newDeadline = offerDeadline();
        int reconfirmations = 0;
        for (VendorAssignment assignment : assignments) {
            if (assignment.getVendor() == null ||
                    (assignment.getStatus() != VendorAssignmentStatus.ACCEPTED &&
                            assignment.getStatus() != VendorAssignmentStatus.PENDING)) {
                continue;
            }

            VendorAssignmentStatus oldStatus = assignment.getStatus();
            if (oldStatus == VendorAssignmentStatus.ACCEPTED) {
                workflowEngine.validateAssignmentTransition(oldStatus, VendorAssignmentStatus.PENDING, Role.COORDINATOR);
            }
            assignment.setStatus(VendorAssignmentStatus.PENDING);
            assignment.setRespondedAt(null);
            assignment.setExpiresAt(newDeadline);
            VendorAssignment saved = assignmentRepository.save(assignment);
            eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));
            reconfirmations++;
        }
        return reconfirmations;
    }

    public List<String> getCategoriesForEventType(String eventType) {
        return CategoryUtils.externalVendorCategories(eventType, CategoryUtils.categoriesForEventType(eventType));
    }

    public List<String> getRequiredCategoriesFor(Event event) {
        return requiredCategoriesFor(event);
    }

    @Transactional(readOnly = true)
    public VendorDecisionPreviewResponse previewVendorDecision(Long eventId, String category) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));
        Inquiry inquiry = event.getInquiry();
        LocalDate eventDate = inquiry != null ? inquiry.getEventDate() : null;
        if (eventDate == null) {
            throw new BusinessException("Event date is required to evaluate vendors", "INVALID_EVENT_DATE");
        }

        VendorRankingService.DecisionPreview preview = rankingService.previewForEvent(
                eventId, inquiry.getEventType(), category, eventDate);
        List<VendorDecisionPreviewResponse.EligibleVendor> eligible = new ArrayList<>();
        for (int index = 0; index < preview.eligible().size(); index++) {
            VendorRankingService.Ranked candidate = preview.eligible().get(index);
            eligible.add(new VendorDecisionPreviewResponse.EligibleVendor(
                    candidate.vendor().getId(), candidate.vendor().getCompanyName(), index + 1,
                    candidate.score() * 100.0, candidate.rating(), candidate.qualityScore() * 100.0,
                    candidate.workloadScore() * 100.0, candidate.rotationScore() * 100.0,
                    "Passed event-specific service, account, insurance, prior-attempt, and availability checks."));
        }
        List<VendorDecisionPreviewResponse.ExcludedVendor> excluded = preview.excluded().stream()
                .map(candidate -> new VendorDecisionPreviewResponse.ExcludedVendor(
                        candidate.vendorId(), candidate.vendorName(), candidate.reason()))
                .toList();
        return new VendorDecisionPreviewResponse(eventId, category, eventDate, eligible, excluded);
    }

    public boolean hasAllCategoriesFilled(Event event) {
        return buildEscalations(event).stream().allMatch(CategoryEscalation::isResolved);
    }

    public long countActiveAssignmentsForVendor(Long vendorId) {
        return assignmentRepository.countActiveAndPendingByVendor(vendorId);
    }

    public Vendor getVendorByUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User", -1L));
        return vendorRepository.findByUserId(user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Vendor", -1L));
    }

    @Nullable
    public Vendor getVendorByUserOptional(String username) {
        return userRepository.findByUsername(username)
                .flatMap(user -> vendorRepository.findByUserId(user.getId()))
                .orElse(null);
    }

    public List<VendorAssignment> getOpenAssignmentsForCategory(String category) {
        return assignmentRepository.findOpenAssignmentsForCategory(category,
                List.of(EventStatus.COMPLETED, EventStatus.CANCELLED, EventStatus.CLOSED));
    }

    public List<VendorAssignment> getEligibleOpenAssignmentsForVendor(Long vendorId) {
        Vendor vendor = getVendorById(vendorId);
        return assignmentRepository.findOpenAssignmentsForCategories(
                        CategoryUtils.categoryVariants(vendor.getServiceCategory()),
                        List.of(EventStatus.COMPLETED, EventStatus.CANCELLED, EventStatus.CLOSED))
                .stream()
                .filter(assignment -> eligibilityService.evaluate(
                        vendor,
                        assignment.getServiceCategory(),
                        assignment.getEvent().getInquiry().getEventDate(),
                        assignment.getEvent().getId(),
                        assignment.getEvent().getInquiry().getEventType(),
                        Set.copyOf(assignmentRepository.findTriedVendorIds(
                                assignment.getEvent().getId(), assignment.getServiceCategory())))
                        .eligible())
                .toList();
    }

    public List<VendorAssignment> getOpenAssignmentsForCoordinator() {
        return assignmentRepository.findByStatus(VendorAssignmentStatus.OPEN);
    }

    @Transactional
    public VendorAssignment forceAssignToOpenAssignment(Long assignmentId, Long vendorId) {
        return forceAssignToOpenAssignment(
                assignmentId, vendorId, null, "Coordinator force assignment", null, null, null);
    }

    public VendorAssignment forceAssignToOpenAssignment(Long assignmentId, Long vendorId, String category,
                                                        String reason, String serviceOrder, Long actorId, String actorUsername) {
        VendorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));

        if (assignment.getStatus() != VendorAssignmentStatus.OPEN) {
            throw new BusinessException(
                    String.format("Assignment is not open (current status: %s)", assignment.getStatus()),
                    "ASSIGNMENT_NOT_OPEN");
        }

        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new EntityNotFoundException("Vendor", vendorId));
        String assignmentCategory = assignment.getServiceCategory();
        if (category != null && (assignmentCategory == null
                || !category.trim().equalsIgnoreCase(assignmentCategory.trim()))) {
            throw new BusinessException("Requested category does not match the open assignment", "VENDOR_CATEGORY_MISMATCH");
        }
        LocalDate eventDate = assignment.getEvent().getInquiry().getEventDate();
        requireEligible(vendor, assignment.getEvent(), assignmentCategory,
                Set.copyOf(assignmentRepository.findTriedVendorIds(
                        assignment.getEvent().getId(), assignmentCategory)));
        String normalizedReason = requireCoordinatorReason(reason);

        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.OPEN, VendorAssignmentStatus.PENDING, Role.COORDINATOR);
        int rowsUpdated = assignmentRepository.claimOpenAssignment(
                assignmentId, vendorId, offerDeadline());
        if (rowsUpdated == 0) {
            throw new BusinessException("Assignment is no longer open", "ASSIGNMENT_ALREADY_CLAIMED");
        }
        assignment = assignmentRepository.findById(assignmentId).orElseThrow();
        assignment.setVendor(vendor);
        assignment.setVendorName(vendor.getCompanyName());
        assignment.setSelectionReason(SelectionReason.COORDINATOR_FORCED);
        assignment.setDecisionSnapshot(buildCoordinatorDecisionSnapshot(
                assignmentCategory, eventDate, vendor, normalizedReason, actorId, actorUsername,
                SelectionReason.COORDINATOR_FORCED));
        assignment.setServiceOrder(serviceOrder);
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setExpiresAt(offerDeadline());
        assignment.setRespondedAt(null);
        VendorAssignment saved = assignmentRepository.save(assignment);

        eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));

        evaluateEventRollup(assignment.getEvent(), Role.COORDINATOR);

        log.info("Coordinator force-assigned vendor {} to open assignment {}", vendorId, assignmentId);
        return saved;
    }

    @Transactional(readOnly = true)
    public VendorTrailResponse getVendorTrail(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));

        List<VendorAssignment> all = assignmentRepository.findByEventId(eventId);

        List<String> ordered = new ArrayList<>(requiredCategoriesFor(event));
        all.stream()
                .map(VendorAssignment::getServiceCategory)
                .distinct()
                .filter(c -> !ordered.contains(c))
                .forEach(ordered::add);

        List<VendorTrailResponse.CategoryTrail> categories = ordered.stream()
                .map(category -> toCategoryTrail(new CategoryEscalation(
                        eventId,
                        category,
                        all.stream()
                                .filter(a -> category.equals(a.getServiceCategory()))
                                .sorted(Comparator.comparing(VendorAssignment::getId))
                                .toList())))
                .toList();

        return new VendorTrailResponse(event.getId(), event.getName(), categories);
    }

    private VendorTrailResponse.CategoryTrail toCategoryTrail(CategoryEscalation escalation) {
        List<VendorAssignment> attempts = escalation.attempts();
        List<VendorTrailResponse.Attempt> rows = new ArrayList<>();

        for (int i = 0; i < attempts.size(); i++) {
            VendorAssignment next = (i + 1 < attempts.size()) ? attempts.get(i + 1) : null;
            rows.add(toAttempt(i + 1, attempts.get(i), next));
        }

        String state = escalation.isResolved()
                ? "RESOLVED"
                : escalation.isPending() ? "PENDING" : "EXHAUSTED";

        return new VendorTrailResponse.CategoryTrail(
                escalation.category(), state, rows.size(), rows);
    }

    private VendorTrailResponse.Attempt toAttempt(
            int number, VendorAssignment a, VendorAssignment next) {

        Vendor vendor = a.getVendor();

        LocalDateTime offeredAt = a.getAssignedAt() != null
                ? a.getAssignedAt()
                : a.getCreatedAt();

        return new VendorTrailResponse.Attempt(
                number,
                a.getId(),
                vendor == null ? null : vendor.getId(),
                a.getVendorName(),
                a.getStatus(),
                a.getRankingScore(),
                a.getSelectionReason(),
                a.getSelectionReason() == null ? null : a.getSelectionReason().getLabel(),
                offeredAt,
                a.getRespondedAt(),
                a.getExpiresAt(),
                a.getDeclineReason(),
                describeOutcome(a, next),
                a.getDecisionSnapshot()
        );
    }

    private String describeOutcome(VendorAssignment a, VendorAssignment next) {
        switch (a.getStatus()) {
            case ACCEPTED:
                return "accepted";
            case COMPLETED:
                return "completed";
            case CANCELLED:
                return "cancelled";
            case PENDING:
                return "awaiting response";
            case OPEN:
                return "open to the vendor pool";
            case DECLINED:
            case EXPIRED:
                if (next == null) {
                    return "needs coordinator action";
                }
                SelectionReason nextReason = next.getSelectionReason();
                if (nextReason == SelectionReason.POOL_OPENED
                        || nextReason == SelectionReason.POOL_CLAIM
                        || nextReason == SelectionReason.COORDINATOR_FORCED) {
                    return "opened to the vendor pool";
                }
                return next.getVendorName() == null
                        ? "advanced to the next attempt"
                        : "advanced to " + next.getVendorName();
            default:
                return null;
        }
    }
}
