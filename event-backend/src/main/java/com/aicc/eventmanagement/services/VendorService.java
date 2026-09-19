package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.entities.VendorBookedDate;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.events.VendorAssignmentEvent;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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

    // ============ EVENT TYPE → REQUIRED CATEGORIES ============

    private static final Map<String, List<String>> EVENT_CATEGORIES = Map.of(
        "conference", List.of("av", "catering", "security"),
        "wedding", List.of("catering", "photography", "music"),
        "trade_show", List.of("av", "security", "cleaning"),
        "exhibition", List.of("av", "security", "cleaning"),
        "concert", List.of("av", "security", "music"),
        "gala", List.of("catering", "photography", "music", "security"),
        "seminar", List.of("av", "catering")
    );

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
        // Check 1: Vendor has a manually booked date
        boolean hasBookedDate = bookedDateRepository.existsByVendorIdAndBookedDate(vendorId, date);
        if (hasBookedDate) {
            log.debug("Vendor {} has booked date on {}", vendorId, date);
            return false;
        }

        // Check 2: Vendor has an ACCEPTED assignment on this date
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

        // Check if already booked
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

        List<String> requiredCategories = EVENT_CATEGORIES.getOrDefault(eventType, List.of());

        if (requiredCategories.isEmpty()) {
            log.warn("No category mapping found for event type: {}", eventType);
            return List.of();
        }

        log.info("Auto-assigning {} categories for event {} (type: {})",
            requiredCategories.size(), event.getId(), eventType);

        List<VendorAssignment> assignments = new ArrayList<>();
        List<String> unfilledCategories = new ArrayList<>();

        for (String category : requiredCategories) {
            Vendor bestVendor = findBestVendor(category, eventDate);

            if (bestVendor != null) {
                VendorAssignment assignment = VendorAssignment.builder()
                    .event(event)
                    .vendor(bestVendor)
                    .vendorName(bestVendor.getCompanyName())
                    .serviceCategory(category)
                    .status(VendorAssignmentStatus.PENDING)
                    .assignedAt(LocalDateTime.now())
                    .build();

                assignments.add(assignment);
                log.info("Assigned {} to event {} for category {}",
                    bestVendor.getCompanyName(), event.getId(), category);
            } else {
                unfilledCategories.add(category);
                log.warn("No vendor available for category {} on date {} for event {}",
                    category, eventDate, event.getId());
            }
        }

        // Save assignments
        List<VendorAssignment> saved = new ArrayList<>();
        if (!assignments.isEmpty()) {
            saved = assignmentRepository.saveAll(assignments);
        }

        // Update event status
        EventStatus newStatus;
        String newUnfilled = null;

        if (!unfilledCategories.isEmpty()) {
            // Some categories couldn't be filled → needs coordinator
            newStatus = EventStatus.NEEDS_COORDINATOR;
            newUnfilled = String.join(",", unfilledCategories);
            log.warn("Event {} needs coordinator for categories: {}", event.getId(), unfilledCategories);
        } else if (!saved.isEmpty()) {
            // All categories filled → awaiting vendors
            newStatus = EventStatus.AWAITING_VENDORS;
        } else {
            // No assignments created at all → needs coordinator
            newStatus = EventStatus.NEEDS_COORDINATOR;
            log.warn("Event {} needs coordinator - no vendors found for any category", event.getId());
        }

        if (event.getStatus() != newStatus) {
            workflowEngine.validateTransition(event.getStatus(), newStatus, Role.COORDINATOR);
            event.setStatus(newStatus);
        }
        if (newUnfilled != null) {
            event.setUnfilledCategories(newUnfilled);
        }
        eventRepository.save(event);

        return saved;
    }

    // ============ BEST VENDOR SELECTION (WITH LOAD BALANCING) ============

    private Vendor findBestVendor(String category, LocalDate date) {
        List<Vendor> available = findAvailableVendors(category, date, null);

        if (available.isEmpty()) {
            return null;
        }

        // Get active assignment counts for load balancing
        List<Long> vendorIds = available.stream()
            .map(Vendor::getId)
            .collect(Collectors.toList());

        Map<Long, Long> assignmentCounts = assignmentRepository
            .countActiveAssignmentsByVendors(vendorIds).stream()
            .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        // Sort by: fewest active assignments (load balancing) → highest rating
        // Fixed: Use reverseOrder() on rating comparator instead of reversing the whole chain
        return available.stream()
            .sorted(Comparator
                .comparingLong((Vendor v) -> assignmentCounts.getOrDefault(v.getId(), 0L))
                .thenComparing(Vendor::getRating, Comparator.reverseOrder()))
            .findFirst()
            .orElse(null);
    }

    // ============ MANUAL ASSIGNMENT (COORDINATOR OVERRIDE) ============

    @Transactional
    public VendorAssignment manualAssign(Long eventId, String category, Long vendorId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EntityNotFoundException("Event", eventId));

        Vendor vendor = getVendorById(vendorId);
        LocalDate eventDate = event.getInquiry().getEventDate();

        // Check if vendor is available
        if (!isVendorAvailable(vendorId, eventDate)) {
            throw new BusinessException(
                String.format("Vendor '%s' is not available on %s", vendor.getCompanyName(), eventDate),
                "VENDOR_UNAVAILABLE"
            );
        }

        // Check if category already has an assignment
        if (assignmentRepository.existsByEventIdAndServiceCategory(eventId, category)) {
            throw new BusinessException(
                String.format("Category '%s' already has an assignment for this event", category),
                "CATEGORY_ALREADY_ASSIGNED"
            );
        }

        // Create assignment
        VendorAssignment assignment = VendorAssignment.builder()
            .event(event)
            .vendor(vendor)
            .vendorName(vendor.getCompanyName())
            .serviceCategory(category)
            .status(VendorAssignmentStatus.PENDING)
            .assignedAt(LocalDateTime.now())
            .build();

        VendorAssignment saved = assignmentRepository.save(assignment);

        // Publish event for email notification
        eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));

        // Remove category from unfilled list
        if (event.getUnfilledCategories() != null) {
            List<String> unfilled = new ArrayList<>(List.of(event.getUnfilledCategories().split(",")));
            unfilled.remove(category);
            event.setUnfilledCategories(unfilled.isEmpty() ? null : String.join(",", unfilled));
        }

        EventStatus newStatus = (event.getUnfilledCategories() == null
                || event.getUnfilledCategories().isEmpty())
                ? EventStatus.AWAITING_VENDORS
                : EventStatus.NEEDS_COORDINATOR;

        if (event.getStatus() != newStatus) {
            workflowEngine.validateTransition(event.getStatus(), newStatus, Role.COORDINATOR);
            event.setStatus(newStatus);
        }

        eventRepository.save(event);
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

        if ("ACCEPTED".equalsIgnoreCase(response)) {
            // Check for conflicts before accepting
            LocalDate eventDate = assignment.getEvent().getInquiry().getEventDate();

            if (!isVendorAvailable(assignment.getVendor().getId(), eventDate)) {
                throw new BusinessException(
                    "Vendor has a conflict on this date. Cannot accept.",
                    "VENDOR_CONFLICT"
                );
            }

            assignment.setStatus(VendorAssignmentStatus.ACCEPTED);

        } else if ("DECLINED".equalsIgnoreCase(response)) {
            assignment.setStatus(VendorAssignmentStatus.DECLINED);
            assignment.setDeclineReason(declineReason);

            // Auto-reassign after decline
            autoReassign(assignment);

        } else {
            throw new BusinessException(
                "Invalid response. Must be 'ACCEPTED' or 'DECLINED'",
                "INVALID_RESPONSE"
            );
        }

        assignment.setRespondedAt(LocalDateTime.now());

        VendorAssignment saved = assignmentRepository.save(assignment);

        // Publish event for email notification (vendor responded)
        eventPublisher.publishEvent(new VendorAssignmentEvent(this, saved));

        // Check if all categories are now ACCEPTED
        checkAndUpdateEventStatus(assignment.getEvent(), Role.VENDOR);

        return saved;
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

        // Find next best vendor (excluding the one that declined)
        List<Vendor> available = findAvailableVendors(category, eventDate, declinedVendorId);

        if (available.isEmpty()) {
            // No vendors available → mark NEEDS_COORDINATOR
            if (event.getStatus() != EventStatus.NEEDS_COORDINATOR) {
                workflowEngine.validateTransition(
                    event.getStatus(), EventStatus.NEEDS_COORDINATOR, Role.VENDOR);
                event.setStatus(EventStatus.NEEDS_COORDINATOR);
            }

            // Add to unfilled if not already there
            String unfilled = event.getUnfilledCategories();
            if (unfilled == null || !unfilled.contains(category)) {
                event.setUnfilledCategories(
                    unfilled == null ? category : unfilled + "," + category
                );
            }

            eventRepository.save(event);
            log.warn("No alternative vendor for category {} in event {} - needs coordinator",
                category, event.getId());

            // Transition to OPEN for vendor self-claim instead of immediate escalation
            if (declinedAssignment.getStatus() == VendorAssignmentStatus.PENDING) {
                declinedAssignment.setStatus(VendorAssignmentStatus.OPEN);
                assignmentRepository.save(declinedAssignment);
                log.info("Assignment {} transitioned to OPEN - awaiting vendor claim", declinedAssignment.getId());
            }
            return;
        }

        // Find best alternative (load balancing)
        List<Long> vendorIds = available.stream()
            .map(Vendor::getId)
            .collect(Collectors.toList());

        Map<Long, Long> assignmentCounts = assignmentRepository
            .countActiveAssignmentsByVendors(vendorIds).stream()
            .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        Vendor newVendor = available.stream()
            .sorted(Comparator
                .comparingLong((Vendor v) -> assignmentCounts.getOrDefault(v.getId(), 0L))
                .thenComparing(Vendor::getRating, Comparator.reverseOrder()))
            .findFirst()
            .orElse(null);

        // Create new assignment
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

    // ============ EVENT STATUS CHECK ============

    private void checkAndUpdateEventStatus(Event event, Role triggeringRole) {
        // Get all assignments for this event
        List<VendorAssignment> assignments = assignmentRepository.findByEventId(event.getId());

        // Check if all assignments are ACCEPTED
        boolean allAccepted = !assignments.isEmpty()
            && assignments.stream()
            .allMatch(a -> a.getStatus() == VendorAssignmentStatus.ACCEPTED);

        if (allAccepted && event.getStatus() != EventStatus.CONFIRMED) {
            // All vendors accepted
            workflowEngine.validateTransition(
                event.getStatus(), EventStatus.CONFIRMED, triggeringRole);
            event.setStatus(EventStatus.CONFIRMED);
            eventRepository.save(event);
            log.info("Event {} confirmed - all vendors accepted", event.getId());
        }
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

        // Atomic claim: only proceed if the assignment is still OPEN
        // This prevents race conditions when multiple vendors try to claim
        int rowsUpdated = assignmentRepository.claimOpenAssignment(assignmentId, vendorId);
        if (rowsUpdated == 0) {
            throw new BusinessException(
                "Assignment was claimed by another vendor",
                "ASSIGNMENT_ALREADY_CLAIMED");
        }

        // Reload and update
        assignment = assignmentRepository.findById(assignmentId).get();
        assignment.setStatus(VendorAssignmentStatus.PENDING);
        assignment.setRespondedAt(LocalDateTime.now());
        assignmentRepository.save(assignment);

        log.info("Vendor {} claimed open assignment {}", vendorId, assignmentId);
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

    public List<VendorAssignment> getPendingAssignmentsForVendor(Long vendorId) {
        return assignmentRepository.findByVendorIdAndStatus(vendorId, VendorAssignmentStatus.PENDING);
    }

    // ============ HELPER METHODS ============

    public List<String> getCategoriesForEventType(String eventType) {
        return EVENT_CATEGORIES.getOrDefault(eventType, List.of());
    }

    public boolean hasAllCategoriesFilled(Event event) {
        String eventType = event.getInquiry().getEventType();
        List<String> required = EVENT_CATEGORIES.getOrDefault(eventType, List.of());

        if (required.isEmpty()) {
            return true;
        }

        List<VendorAssignment> assignments = assignmentRepository.findByEventId(event.getId());

        for (String category : required) {
            boolean hasAssignment = assignments.stream()
                .anyMatch(a -> a.getServiceCategory().equals(category)
                    && a.getStatus() == VendorAssignmentStatus.ACCEPTED);

            if (!hasAssignment) {
                return false;
            }
        }

        return true;
    }

    public long countActiveAssignmentsForVendor(Long vendorId) {
        return assignmentRepository.countActiveAndPendingByVendor(vendorId);
    }

    // ============ VENDOR LOOKUP BY USER ============

    public Vendor getVendorByUser(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new EntityNotFoundException("User", -1L));
        return vendorRepository.findByUserId(user.getId())
            .orElseThrow(() -> new EntityNotFoundException("Vendor", -1L));
    }

    // ============ OPEN ASSIGNMENT METHODS ============

    public List<VendorAssignment> getOpenAssignmentsForCategory(String category) {
        return assignmentRepository.findByStatusAndServiceCategory(VendorAssignmentStatus.OPEN, category);
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

        // Update assignment
        assignment.setVendor(vendor);
        assignment.setVendorName(vendor.getCompanyName());
        assignment.setStatus(VendorAssignmentStatus.PENDING);
        assignment.setAssignedAt(LocalDateTime.now());
        VendorAssignment saved = assignmentRepository.save(assignment);

        log.info("Coordinator force-assigned vendor {} to open assignment {}", vendorId, assignmentId);
        return saved;
    }
}
