package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.entities.VendorBookedDate;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.events.VendorAssignmentEvent;
import com.aicc.eventmanagement.events.WorkflowTransitionEvent;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.CreateVendorRequest;
import com.aicc.eventmanagement.payload.UpdateVendorRequest;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.aicc.eventmanagement.util.CategoryUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
                .rating(3)          // sensible default for new vendors
                .isActive(true)
                .build();
        return vendorRepository.save(vendor);
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

            // 1. Try client's preferred vendors first
            if (!preferredVendorIds.isEmpty()) {
                for (Long vendorId : preferredVendorIds) {
                    Optional<Vendor> prefVendor = vendorRepository.findById(vendorId);
                    if (prefVendor.isPresent()
                            && category.equals(prefVendor.get().getServiceCategory())
                            && prefVendor.get().isActive()
                            && isVendorAvailable(vendorId, eventDate)) {
                        assignment = VendorAssignment.builder()
                                .event(event)
                                .vendor(prefVendor.get())
                                .vendorName(prefVendor.get().getCompanyName())
                                .serviceCategory(category)
                                .status(VendorAssignmentStatus.PENDING)
                                .assignedAt(LocalDateTime.now())
                                .build();
                        log.info("Using CLIENT-PREFERRED vendor {} for category {} on event {}",
                                prefVendor.get().getCompanyName(), category, event.getId());
                        break;
                    }
                }
            }

            // 2. Fall back to ranking
            if (assignment == null) {
                List<VendorRankingService.Ranked> ranked = rankingService.rank(category, eventDate, Set.of());
                if (!ranked.isEmpty()) {
                    Vendor bestVendor = ranked.get(0).vendor();
                    assignment = VendorAssignment.builder()
                            .event(event)
                            .vendor(bestVendor)
                            .vendorName(bestVendor.getCompanyName())
                            .serviceCategory(category)
                            .status(VendorAssignmentStatus.PENDING)
                            .assignedAt(LocalDateTime.now())
                            .build();
                    log.info("Auto-assigned {} to event {} for category {} (ranked fallback)",
                            bestVendor.getCompanyName(), event.getId(), category);
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
        }

        if (!unfilledCategories.isEmpty()) {
            event.setUnfilledCategories(String.join(",", unfilledCategories));
            log.warn("Event {} needs coordinator for categories: {}", event.getId(), unfilledCategories);
        }
        eventRepository.save(event);
        evaluateEventRollup(event, Role.COORDINATOR);

        return saved;
    }

    private List<Long> parsePreferredVendors(Inquiry inquiry) {
        if (inquiry.getPreferredVendorIds() == null || inquiry.getPreferredVendorIds().isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(inquiry.getPreferredVendorIds(), new TypeReference<List<Long>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse preferred vendors for inquiry {}: {}", inquiry.getId(), e.getMessage());
            return List.of();
        }
    }

    // ============ MANUAL ASSIGNMENT ============

    @Transactional
    public VendorAssignment manualAssign(Long eventId, String category, Long vendorId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));

        Vendor vendor = getVendorById(vendorId);
        LocalDate eventDate = event.getInquiry().getEventDate();

        if (!isVendorAvailable(vendorId, eventDate)) {
            throw new BusinessException(
                    String.format("Vendor '%s' is not available on %s", vendor.getCompanyName(), eventDate),
                    "VENDOR_UNAVAILABLE"
            );
        }

        if (assignmentRepository.existsByEventIdAndServiceCategory(eventId, category)) {
            throw new BusinessException(
                    String.format("Category '%s' already has an assignment for this event", category),
                    "CATEGORY_ALREADY_ASSIGNED"
            );
        }

        VendorAssignment assignment = VendorAssignment.builder()
                .event(event)
                .vendor(vendor)
                .vendorName(vendor.getCompanyName())
                .serviceCategory(category)
                .status(VendorAssignmentStatus.PENDING)
                .assignedAt(LocalDateTime.now())
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

        autoReassign(assignment);
        evaluateEventRollup(assignment.getEvent(), Role.VENDOR);

        return assignment;
    }

    // ============ AUTO-REASSIGN ON DECLINE ============

    @Transactional
    public void autoReassign(VendorAssignment declinedAssignment) {
        Event event = declinedAssignment.getEvent();
        String category = declinedAssignment.getServiceCategory();
        LocalDate eventDate = event.getInquiry().getEventDate();
        Long declinedVendorId = declinedAssignment.getVendor().getId();

        log.info("Auto-reassigning category {} for event {} (vendor {} declined)",
                category, event.getId(), declinedVendorId);

        List<VendorRankingService.Ranked> ranked =
                rankingService.rankForEvent(event.getId(), category, eventDate);

        if (ranked.isEmpty()) {
            workflowEngine.validateAssignmentTransition(
                    VendorAssignmentStatus.DECLINED,
                    VendorAssignmentStatus.OPEN,
                    Role.VENDOR);
            declinedAssignment.setStatus(VendorAssignmentStatus.OPEN);
            assignmentRepository.save(declinedAssignment);

            String unfilled = event.getUnfilledCategories();
            List<String> unfilledCategories = unfilled == null || unfilled.isBlank()
                    ? new ArrayList<>()
                    : new ArrayList<>(List.of(unfilled.split(",")));
            if (!unfilledCategories.contains(category)) {
                unfilledCategories.add(category);
                event.setUnfilledCategories(String.join(",", unfilledCategories));
            }
            eventRepository.save(event);

            log.warn("Category {} for event {} exhausted its ranked list - assignment {} is now OPEN",
                    category, event.getId(), declinedAssignment.getId());
            return;
        }

        Vendor newVendor = ranked.get(0).vendor();

        VendorAssignment newAssignment = VendorAssignment.builder()
                .event(event)
                .vendor(newVendor)
                .vendorName(newVendor.getCompanyName())
                .serviceCategory(category)
                .status(VendorAssignmentStatus.PENDING)
                .assignedAt(LocalDateTime.now())
                .build();

        assignmentRepository.save(newAssignment);
        log.info("Auto-reassigned {} to vendor {} for event {}",
                category, newVendor.getCompanyName(), event.getId());
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

        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.OPEN,
                VendorAssignmentStatus.PENDING,
                Role.VENDOR);

        int rowsUpdated = assignmentRepository.claimOpenAssignment(assignmentId, vendorId);
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
        return assignmentRepository.findByVendorId(vendorId);
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
        List<VendorAssignment> ratedAssignments = assignmentRepository
                .findByVendorIdAndStatus(vendor.getId(), VendorAssignmentStatus.COMPLETED).stream()
                .filter(a -> a.getVendorRating() != null)
                .toList();
        double average = ratedAssignments.stream()
                .mapToDouble(VendorAssignment::getVendorRating)
                .average()
                .orElse(vendor.getRating() == null ? 0.0 : vendor.getRating());
        vendor.setRating((int) Math.round(average));
        vendorRepository.save(vendor);
        return saved;
    }

    public List<VendorAssignment> getPendingAssignmentsForVendor(Long vendorId) {
        return assignmentRepository.findByVendorIdAndStatus(vendorId, VendorAssignmentStatus.PENDING);
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

    public List<VendorAssignment> getOpenAssignmentsForCategory(String category) {
        return assignmentRepository.findOpenAssignmentsForCategory(category,
                List.of(EventStatus.COMPLETED, EventStatus.CANCELLED, EventStatus.CLOSED));
    }

    // ============ COORDINATOR FORCE ASSIGN ============

    @Transactional
    public VendorAssignment forceAssignToOpenAssignment(Long assignmentId, Long vendorId) {
        VendorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));

        if (assignment.getStatus() != VendorAssignmentStatus.OPEN) {
            throw new BusinessException(
                    String.format("Assignment is not open (current status: %s)", assignment.getStatus()),
                    "ASSIGNMENT_NOT_OPEN");
        }

        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new EntityNotFoundException("Vendor", vendorId));

        workflowEngine.validateAssignmentTransition(
                VendorAssignmentStatus.OPEN,
                VendorAssignmentStatus.PENDING,
                Role.COORDINATOR);
        assignment.setVendor(vendor);
        assignment.setVendorName(vendor.getCompanyName());
        assignment.setStatus(VendorAssignmentStatus.PENDING);
        assignment.setAssignedAt(LocalDateTime.now());
        VendorAssignment saved = assignmentRepository.save(assignment);

        evaluateEventRollup(assignment.getEvent(), Role.COORDINATOR);

        log.info("Coordinator force-assigned vendor {} to open assignment {}", vendorId, assignmentId);
        return saved;
    }
}