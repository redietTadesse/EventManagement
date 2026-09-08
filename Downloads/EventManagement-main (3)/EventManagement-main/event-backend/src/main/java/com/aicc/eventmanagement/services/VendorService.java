package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.entities.VendorBookedDate;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.events.VendorAssignmentEvent;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.repositories.EventRepository;
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
    private final ApplicationEventPublisher eventPublisher;

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
        if (!unfilledCategories.isEmpty()) {
            // Some categories couldn't be filled → needs coordinator
            event.setStatus(EventStatus.NEEDS_COORDINATOR);
            event.setUnfilledCategories(String.join(",", unfilledCategories));
            log.warn("Event {} needs coordinator for categories: {}", event.getId(), unfilledCategories);
        } else if (!saved.isEmpty()) {
            // All categories filled → awaiting vendors
            event.setStatus(EventStatus.AWAITING_VENDORS);
        } else {
            // No assignments created at all → needs coordinator
            event.setStatus(EventStatus.NEEDS_COORDINATOR);
            log.warn("Event {} needs coordinator - no vendors found for any category", event.getId());
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

        // Sort by: fewest active assignments → highest rating → highest rating count
        return available.stream()
            .sorted(Comparator
                .comparingLong((Vendor v) -> assignmentCounts.getOrDefault(v.getId(), 0L))
                .thenComparingDouble(Vendor::getRating)
                .reversed())
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

        // Update event status
        if (event.getUnfilledCategories() == null || event.getUnfilledCategories().isEmpty()) {
            event.setStatus(EventStatus.AWAITING_VENDORS);
        } else {
            event.setStatus(EventStatus.NEEDS_COORDINATOR);
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
        checkAndUpdateEventStatus(assignment.getEvent());

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
            event.setStatus(EventStatus.NEEDS_COORDINATOR);

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
                .thenComparingDouble(Vendor::getRating)
                .reversed())
            .findFirst()
            .orElse(null);

        if (newVendor == null) {
            event.setStatus(EventStatus.NEEDS_COORDINATOR);
            eventRepository.save(event);
            return;
        }

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

    private void checkAndUpdateEventStatus(Event event) {
        // Get all assignments for this event
        List<VendorAssignment> assignments = assignmentRepository.findByEventId(event.getId());

        // Check if all assignments are ACCEPTED
        boolean allAccepted = assignments.stream()
            .allMatch(a -> a.getStatus() == VendorAssignmentStatus.ACCEPTED);

        // Check if any are DECLINED
        boolean anyDeclined = assignments.stream()
            .anyMatch(a -> a.getStatus() == VendorAssignmentStatus.DECLINED);

        // Check if any are PENDING
        boolean anyPending = assignments.stream()
            .anyMatch(a -> a.getStatus() == VendorAssignmentStatus.PENDING);

        if (allAccepted && !assignments.isEmpty()) {
            // All vendors accepted
            event.setStatus(EventStatus.CONFIRMED);
            log.info("Event {} confirmed - all vendors accepted", event.getId());

        } else if (anyDeclined || (anyPending && event.getStatus() == EventStatus.AWAITING_VENDORS)) {
            // Some declined or pending with no action
            // Status stays as-is unless coordinator needed
        }

        eventRepository.save(event);
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
}
