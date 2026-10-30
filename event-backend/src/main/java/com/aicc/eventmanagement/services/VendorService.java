package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
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
import com.aicc.eventmanagement.payload.VendorPerformanceResponse;
import com.aicc.eventmanagement.payload.VendorReviewResponse;
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
import org.springframework.lang.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.aicc.eventmanagement.payload.VendorTrailResponse;
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

    private final VendorRepository vendorRepository;
    private final VendorBookedDateRepository bookedDateRepository;
    private final VendorAssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final WorkflowEngine workflowEngine;
    private final VendorRankingService rankingService;
    private final VendorRatingService ratingService;
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
                .serviceCategory(req.getServiceCategory())
                .description(req.getDescription())
                .phone(req.getPhone())
                .email(req.getEmail())
                .rating(0.0)
                .insuranceExpiryDate(req.getInsuranceExpiryDate())
                .isActive(true)
                .build();
        return vendorRepository.save(vendor);
    }

    /**
     * Public onboarding: create an inactive vendor + login so an admin can
     * review and activate from Vendor Management. The applicant cannot log in
     * until {@link #toggleActive(Long)} is used.
     */
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
                .serviceCategory(req.getServiceCategory())
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

    @Transactional
    public Vendor updateVendor(Long id, UpdateVendorRequest req) {
        Vendor vendor = getVendorById(id);

        if (req.getCompanyName() != null)      vendor.setCompanyName(req.getCompanyName());
        if (req.getServiceCategory() != null)  vendor.setServiceCategory(req.getServiceCategory());
        if (req.getDescription() != null)      vendor.setDescription(req.getDescription());
        if (req.getPhone() != null)            vendor.setPhone(req.getPhone());
        if (req.getEmail() != null)            vendor.setEmail(req.getEmail());
        if (req.getActive() != null)           vendor.setActive(req.getActive());
        if (req.getInsuranceExpiryDate() != null) vendor.setInsuranceExpiryDate(req.getInsuranceExpiryDate());

        log.info("Updated vendor {}", id);
        return vendorRepository.save(vendor);
    }

    @Transactional
    public Vendor toggleActive(Long id) {
        Vendor vendor = getVendorById(id);
        vendor.setActive(!vendor.isActive());

        // Keep the linked user account in sync — a deactivated vendor should not
        // be able to log in and accept new assignments.
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

    /**
     * How long a vendor has to answer an offer before the scheduler expires it.
     * Overridable with app.vendor.offer-expiry-hours; 72 hours by default.
     */
    @Value("${app.vendor.offer-expiry-hours:72}")
    private long offerExpiryHours;

    private LocalDateTime offerDeadline() {
        return LocalDateTime.now().plusHours(offerExpiryHours);
    }

    // ============ ESCALATION BUILDER ============

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

    /** The escalation for a single category, ordered oldest attempt first. */
    public CategoryEscalation escalationFor(Event event, String category) {
        List<VendorAssignment> attempts = assignmentRepository
                .findByEventIdAndServiceCategory(event.getId(), category).stream()
                .sorted(Comparator.comparing(VendorAssignment::getId))
                .toList();
        return new CategoryEscalation(event.getId(), category, attempts);
    }

    private List<String> requiredCategoriesFor(Event event) {
        String stored = event.getRequiredCategories();
        if (stored != null && !stored.isBlank()) {
            return CategoryUtils.split(stored);
        }
        return CategoryUtils.EVENT_TYPE_DEFAULTS.getOrDefault(
                event.getInquiry().getEventType(), List.of());
    }

    // ============ VENDOR CRUD ============

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

    // ============ AVAILABILITY CHECKING ============

    public List<Vendor> findAvailableVendors(String category, LocalDate date) {
        return findAvailableVendors(category, date, null);
    }

    public List<Vendor> findAvailableVendors(String category, LocalDate date, Long excludeVendorId) {
        List<Vendor> activeVendors = vendorRepository.findActiveByCategory(category);

        return activeVendors.stream()
                .filter(v -> !v.getId().equals(excludeVendorId))
                .filter(v -> isVendorAvailable(v.getId(), date))
                .collect(Collectors.toList());
    }

    public boolean isVendorAvailable(Long vendorId, LocalDate date) {
        boolean hasBookedDate = bookedDateRepository.existsByVendorIdAndBookedDate(vendorId, date);
        if (hasBookedDate) {
            log.debug("Vendor {} has booked date on {}", vendorId, date);
            return false;
        }

        boolean hasActiveAssignment = assignmentRepository.hasActiveAssignmentOnDate(vendorId, date);
        if (hasActiveAssignment) {
            log.debug("Vendor {} has active assignment on {}", vendorId, date);
            return false;
        }

        return true;
    }

    public boolean isVendorAvailableForEvent(Long vendorId, LocalDate date, Long eventId) {
        if (bookedDateRepository.existsByVendorIdAndBookedDate(vendorId, date)) {
            return false;
        }
        return !assignmentRepository.hasActiveAssignmentOnDateExcludingEvent(vendorId, date, eventId);
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

    // ============ AUTO-ASSIGNMENT ============

    public List<VendorAssignment> autoAssignForEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));

        return autoAssignForEvent(event);
    }

    public List<VendorAssignment> autoAssignForEvent(Event event) {
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
        List<String> unfilledCategories = new ArrayList<>();

        for (String category : requiredCategories) {
            VendorAssignment assignment = null;

            // 1. Try client's preferred vendors first.
            //    No ranking runs on this path, so there is no score to record. The
            //    reason carries the whole explanation instead, which is exactly what
            //    a coordinator needs to see: this vendor was not chosen by the system.
            if (!preferredVendorIds.isEmpty()) {
                List<Map<String, Object>> excludedPreferences = new ArrayList<>();
                for (Long vendorId : preferredVendorIds) {
                    Optional<Vendor> prefVendor = vendorId == null
                            ? Optional.empty()
                            : vendorRepository.findById(vendorId);
                    Vendor candidate = prefVendor.orElse(null);
                    String exclusionReason = getPreferredVendorExclusionReason(candidate, category, eventDate);
                    if (exclusionReason != null) {
                        excludedPreferences.add(excludedPreference(vendorId, candidate, exclusionReason));
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

            // 2. Fall back to ranking. select() captures the score and the reason in
            //    the same call that makes the decision; neither is recoverable later.
            if (assignment == null) {
                Optional<VendorRankingService.Selection> selection =
                        rankingService.select(category, eventDate, Set.of());

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
            } else {
                unfilledCategories.add(category);
                log.warn("No vendor available for category {} on date {} for event {}",
                        category, eventDate, event.getId());
            }
        }

        List<VendorAssignment> saved = new ArrayList<>();
        if (!assignments.isEmpty()) {
            saved = assignmentRepository.saveAll(assignments);
            saved.forEach(a -> eventPublisher.publishEvent(new VendorAssignmentEvent(this, a)));
        }

        if (!unfilledCategories.isEmpty()) {
            event.setUnfilledCategories(String.join(",", unfilledCategories));
            log.warn("Event {} needs coordinator for categories: {}", event.getId(), unfilledCategories);
        }
        eventRepository.save(event);
        evaluateEventRollup(event, Role.COORDINATOR);

        return saved;
    }

    private String getPreferredVendorExclusionReason(Vendor vendor, String category, LocalDate eventDate) {
        if (vendor == null) return "Vendor no longer exists";
        if (vendor.getServiceCategory() == null
                || !category.trim().equalsIgnoreCase(vendor.getServiceCategory().trim())) {
            return "Vendor does not offer this service category";
        }
        if (!vendor.isActive()) return "Vendor is inactive";
        if (vendor.getInsuranceExpiryDate() == null) return "Insurance expiry date is not on file";
        if (vendor.getInsuranceExpiryDate().isBefore(eventDate)) {
            return "Insurance expires before the event date";
        }
        if (bookedDateRepository.existsByVendorIdAndBookedDate(vendor.getId(), eventDate)) {
            return "Vendor has a booked date on the event date";
        }
        if (assignmentRepository.hasActiveAssignmentOnDate(vendor.getId(), eventDate)) {
            return "Vendor has a conflicting assignment on the event date";
        }
        return null;
    }

    private void validateVendorEligibility(Vendor vendor, String category, LocalDate eventDate) {
        if (!vendor.isActive()) {
            throw new BusinessException("Inactive vendors cannot be assigned", "VENDOR_INACTIVE");
        }
        if (vendor.getServiceCategory() == null || category == null
                || !category.trim().equalsIgnoreCase(vendor.getServiceCategory().trim())) {
            throw new BusinessException("Vendor does not offer the requested service category", "VENDOR_CATEGORY_MISMATCH");
        }
        if (vendor.getInsuranceExpiryDate() == null) {
            throw new BusinessException("Vendor insurance expiry date is not on file", "VENDOR_INSURANCE_INVALID");
        }
        if (eventDate == null || vendor.getInsuranceExpiryDate().isBefore(eventDate)) {
            throw new BusinessException("Vendor insurance is not valid for the event date", "VENDOR_INSURANCE_INVALID");
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
            // preferred_vendor_ids is a JSON column, so a null written through it is
            // stored as the JSON literal "null" rather than SQL NULL. That string is
            // neither null nor blank, so it reaches Jackson, which parses JSON null
            // into a Java null. Without this guard the method breaks its own contract
            // and the caller NPEs on isEmpty().
            List<Long> parsed = objectMapper.readValue(
                    inquiry.getPreferredVendorIds(), new TypeReference<List<Long>>() {});
            return parsed == null ? List.of() : parsed;
        } catch (Exception e) {
            log.warn("Failed to parse preferred vendors for inquiry {}: {}", inquiry.getId(), e.getMessage());
            return List.of();
        }
    }

    // ============ MANUAL ASSIGNMENT ============

    /**
     * Coordinator assigns a vendor to a category directly.
     *
     * The old guard rejected any category that had ever had an assignment, which made
     * manual assignment impossible after a single decline — the exact situation where
     * a coordinator most needs it. The check is now against the category's live state:
     * blocked only while it is resolved or has an offer outstanding. An unclaimed pool
     * row is cancelled first so the category does not end up with two live offers.
     */
    @Transactional
    public VendorAssignment manualAssign(Long eventId, String category, Long vendorId) {
        return manualAssign(eventId, category, vendorId, "Coordinator manual assignment", null, null);
    }

    public VendorAssignment manualAssign(Long eventId, String category, Long vendorId,
                                         String reason, Long coordinatorId, String coordinatorUsername) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));

        Vendor vendor = getVendorById(vendorId);
        LocalDate eventDate = event.getInquiry().getEventDate();
        validateVendorEligibility(vendor, category, eventDate);
        String normalizedReason = requireCoordinatorReason(reason);

        if (!isVendorAvailable(vendorId, eventDate)) {
            throw new BusinessException(
                    String.format("Vendor '%s' is not available on %s", vendor.getCompanyName(), eventDate),
                    "VENDOR_UNAVAILABLE"
            );
        }

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
                            VendorAssignmentStatus.OPEN,
                            VendorAssignmentStatus.CANCELLED,
                            Role.COORDINATOR);
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
                .assignedAt(LocalDateTime.now())
                .expiresAt(offerDeadline())
                .build();

        VendorAssignment saved = assignmentRepository.save(assignment);

        eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));

        if (event.getUnfilledCategories() != null) {
            List<String> unfilled = new ArrayList<>(List.of(event.getUnfilledCategories().split(",")));
            unfilled.remove(category);
            event.setUnfilledCategories(unfilled.isEmpty() ? null : String.join(",", unfilled));
        }

        eventRepository.save(event);
        evaluateEventRollup(event, Role.COORDINATOR);
        log.info("Manual assignment: {} for event {} category {}",
                vendor.getCompanyName(), eventId, category);

        return saved;
    }

    // ============ VENDOR RESPONSE ============

    @Transactional
    public VendorAssignment respondToAssignment(Long assignmentId, String response, String declineReason) {
        VendorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));

        if (assignment.getStatus() != VendorAssignmentStatus.PENDING) {
            throw new BusinessException(
                    String.format("Assignment is not pending (current status: %s)", assignment.getStatus()),
                    "ASSIGNMENT_NOT_PENDING"
            );
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
            if (!isVendorAvailable(assignment.getVendor().getId(), eventDate)) {
                throw new BusinessException(
                        "Vendor has a conflict on this date. Cannot accept.",
                        "VENDOR_CONFLICT"
                );
            }
            workflowEngine.validateAssignmentTransition(
                    VendorAssignmentStatus.PENDING,
                    VendorAssignmentStatus.ACCEPTED,
                    Role.VENDOR);
            assignment.setStatus(VendorAssignmentStatus.ACCEPTED);
            assignment.setRespondedAt(LocalDateTime.now());
            VendorAssignment saved = assignmentRepository.save(assignment);
            eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));
            evaluateEventRollup(assignment.getEvent(), Role.VENDOR);
            return saved;
        }

        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.PENDING,
                VendorAssignmentStatus.DECLINED,
                Role.VENDOR);
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

    /**
     * Move a category forward after an attempt fails, by decline or by expiry.
     *
     * The failed row is never touched. If a ranked candidate remains, a new PENDING
     * row is inserted for it; if the list is exhausted, a new vendor-less OPEN row is
     * inserted to put the job in front of the whole pool. That is what keeps the trail
     * append-only: every attempt that ever happened stays exactly as it was.
     *
     * Previously this flipped the declining vendor's own row to OPEN, and the eventual
     * claim then overwrote vendor_id, deleting that vendor's decline from the record.
     */
    @Transactional
    public void advanceAfterFailedAttempt(VendorAssignment failedAttempt, Role triggeringRole) {
        Event event = failedAttempt.getEvent();
        String category = failedAttempt.getServiceCategory();
        LocalDate eventDate = event.getInquiry().getEventDate();

        log.info("Advancing category {} for event {} after attempt {} ended as {}",
                category, event.getId(), failedAttempt.getId(), failedAttempt.getStatus());

        Optional<VendorRankingService.Selection> selection =
                rankingService.selectForEvent(event.getId(), category, eventDate);

        if (selection.isEmpty()) {
            openCategoryToPool(event, category);
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

        // This publish was missing. Without it the replacement vendor is never told
        // about the offer, which was harmless while nothing expired but would now
        // guarantee the offer lapses and cascades through the whole vendor list.
        eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));

        log.info("Reassigned {} to vendor {} for event {} (score {}, reason {})",
                category, s.vendor().getCompanyName(), event.getId(), s.score(), s.reason());
    }

    /** Kept for callers that still use the old name. */
    @Transactional
    public void autoReassign(VendorAssignment declinedAssignment) {
        advanceAfterFailedAttempt(declinedAssignment, Role.VENDOR);
    }

    private void openCategoryToPool(Event event, String category) {
        CategoryEscalation escalation = escalationFor(event, category);

        boolean alreadyOpen = escalation.currentAttempt()
                .map(a -> a.getStatus() == VendorAssignmentStatus.OPEN)
                .orElse(false);

        if (!alreadyOpen) {
            VendorAssignment poolRow = VendorAssignment.builder()
                    .event(event)
                    .serviceCategory(category)
                    .status(VendorAssignmentStatus.OPEN)
                    .selectionReason(SelectionReason.POOL_OPENED)
                    .build();
            assignmentRepository.save(poolRow);
            log.warn("Category {} for event {} exhausted its ranked list - opened to the vendor pool",
                    category, event.getId());
        }

        String unfilled = event.getUnfilledCategories();
        List<String> unfilledCategories = unfilled == null || unfilled.isBlank()
                ? new ArrayList<>()
                : new ArrayList<>(List.of(unfilled.split(",")));
        if (!unfilledCategories.contains(category)) {
            unfilledCategories.add(category);
            event.setUnfilledCategories(String.join(",", unfilledCategories));
        }
        eventRepository.save(event);
    }

    // ============ OFFER EXPIRY ============

    /**
     * Expire offers whose deadline has passed and advance each category.
     *
     * Attributed to VENDOR because the cause is the vendor failing to act, the same
     * actor as a decline. That also keeps the resulting event rollup inside the roles
     * already permitted for AWAITING_VENDORS to NEEDS_COORDINATOR.
     */
    @Transactional
    public int expireStaleOffers() {
        List<VendorAssignment> stale =
                assignmentRepository.findExpiredPendingOffers(LocalDateTime.now());

        int expired = 0;

        for (VendorAssignment assignment : stale) {
            try {
                workflowEngine.validateAssignmentTransition(
                        VendorAssignmentStatus.PENDING,
                        VendorAssignmentStatus.EXPIRED,
                        Role.VENDOR);

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
            } catch (Exception e) {
                log.error("Failed to expire assignment {}: {}", assignment.getId(), e.getMessage());
            }
        }

        return expired;
    }

    // ============ CASCADE ON EVENT COMPLETION/CANCELLATION ============

    @Transactional
    public void completeAssignmentsForEvent(Long eventId, Role triggeringRole) {
        List<VendorAssignment> assignments = assignmentRepository.findByEventId(eventId);
        int closed = 0;
        for (VendorAssignment a : assignments) {
            if (a.getStatus() == VendorAssignmentStatus.ACCEPTED) {
                workflowEngine.validateAssignmentTransition(
                        VendorAssignmentStatus.ACCEPTED,
                        VendorAssignmentStatus.COMPLETED,
                        triggeringRole);
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
                workflowEngine.validateAssignmentTransition(
                        s, VendorAssignmentStatus.CANCELLED, triggeringRole);
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

        // Publish the rollup transition so the audit trail records it
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

    // ============ OPEN ASSIGNMENT CLAIM ============

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
        validateVendorEligibility(vendor, assignment.getServiceCategory(), eventDate);
        if (!isVendorAvailableForEvent(vendorId, eventDate, assignment.getEvent().getId())) {
            throw new BusinessException("Vendor is not available on the event date", "VENDOR_UNAVAILABLE");
        }

        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.OPEN,
                VendorAssignmentStatus.PENDING,
                Role.VENDOR);

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

    // ============ GET ASSIGNMENTS ============

    public List<VendorAssignment> getAssignmentsByEvent(Long eventId) {
        return assignmentRepository.findByEventId(eventId);
    }

    public List<VendorAssignment> getAssignmentsByVendor(Long vendorId) {
        return assignmentRepository.findDetailedByVendorId(vendorId);
    }

    @Transactional(readOnly = true)
    public VendorPerformanceResponse getVendorPerformance(Long vendorId) {
        Vendor vendor = getVendorById(vendorId);
        List<VendorAssignment> assignments = assignmentRepository.findDetailedByVendorId(vendorId);

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
        return assignmentRepository.findDetailedByVendorId(vendorId).stream()
                .filter(a -> a.getStatus() == VendorAssignmentStatus.COMPLETED && a.getVendorRating() != null)
                .sorted(Comparator.comparing(
                        VendorAssignment::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(VendorReviewResponse::from)
                .toList();
    }

    public VendorAssignment getAssignmentById(Long id) {
        return assignmentRepository.findById(id)
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

            assignment.setStatus(VendorAssignmentStatus.PENDING);
            assignment.setRespondedAt(null);
            assignment.setExpiresAt(newDeadline);
            VendorAssignment saved = assignmentRepository.save(assignment);
            eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));
            reconfirmations++;
        }
        return reconfirmations;
    }

    // ============ HELPER METHODS ============

    public List<String> getCategoriesForEventType(String eventType) {
        return CategoryUtils.EVENT_TYPE_DEFAULTS.getOrDefault(eventType, List.of());
    }

    public List<String> getRequiredCategoriesFor(Event event) {
        return requiredCategoriesFor(event);
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

    // NEW: Safe version that returns null instead of throwing (for endpoints that need graceful handling)
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

    public List<VendorAssignment> getOpenAssignmentsForCoordinator() {
        return assignmentRepository.findByStatus(VendorAssignmentStatus.OPEN);
    }

    // ============ COORDINATOR FORCE ASSIGN ============

    @Transactional
    public VendorAssignment forceAssignToOpenAssignment(Long assignmentId, Long vendorId) {
        return forceAssignToOpenAssignment(
                assignmentId, vendorId, null, "Coordinator force assignment", null, null);
    }

    public VendorAssignment forceAssignToOpenAssignment(Long assignmentId, Long vendorId, String category,
                                                        String reason, Long actorId, String actorUsername) {
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
        validateVendorEligibility(vendor, assignmentCategory, eventDate);
        String normalizedReason = requireCoordinatorReason(reason);
        if (!isVendorAvailableForEvent(vendorId, eventDate, assignment.getEvent().getId())) {
            throw new BusinessException("Vendor is not available on the event date", "VENDOR_UNAVAILABLE");
        }

        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.OPEN,
                VendorAssignmentStatus.PENDING,
                Role.COORDINATOR);
        assignment.setVendor(vendor);
        assignment.setVendorName(vendor.getCompanyName());
        assignment.setStatus(VendorAssignmentStatus.PENDING);
        assignment.setSelectionReason(SelectionReason.COORDINATOR_FORCED);
        assignment.setDecisionSnapshot(buildCoordinatorDecisionSnapshot(
                assignmentCategory, eventDate, vendor, normalizedReason, actorId, actorUsername,
                SelectionReason.COORDINATOR_FORCED));
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setExpiresAt(offerDeadline());
        assignment.setRespondedAt(null);
        VendorAssignment saved = assignmentRepository.save(assignment);

        eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));

        evaluateEventRollup(assignment.getEvent(), Role.COORDINATOR);

        log.info("Coordinator force-assigned vendor {} to open assignment {}", vendorId, assignmentId);
        return saved;
    }
    // ============ VENDOR TRAIL ============

    /**
     * The ordered offer history for every category of an event.
     *
     * Categories are the event's required ones first, then any category that has
     * attempts without being required. A coordinator can assign a category the event
     * type does not list, and leaving it out would hide real history from the trail.
     */
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

        // An unclaimed pool row has no vendor and so no assignedAt. createdAt is when
        // it was opened to the pool, which is the moment the coordinator cares about.
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

    /**
     * What happened after this attempt, in one line.
     *
     * For a failed attempt this is derived from the NEXT row's stored selectionReason
     * rather than its current status. A pool row that has since been claimed is now
     * PENDING with a vendor attached, so reading its status would report "advanced to
     * X" and lose the fact that the category went to the whole pool first.
     */
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
                    return "no further action yet";
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
