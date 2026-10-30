package com.aicc.eventmanagement.integration;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.SelectionReason;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.aicc.eventmanagement.services.VendorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for the event-level rollup (Gap 1).
 *
 * The rollup derives the event status from the per-category assignment states:
 *   - any required category stuck (no assignment, or DECLINED/EXPIRED/OPEN/CANCELLED)
 *       -> NEEDS_COORDINATOR
 *   - all required categories ACCEPTED                    -> CONFIRMED
 *   - otherwise                                           -> AWAITING_VENDORS
 *
 * The fixture pins requiredCategories to av, catering, security. The event type
 * "conference" actually defaults to five categories (venue, av, catering, security,
 * registration), and the two these tests never assign would be permanently stuck,
 * forcing every rollup to NEEDS_COORDINATOR regardless of what the test did.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Event-Level Rollup Integration Tests")
class EventRollupTest {

    @Autowired
    private VendorService vendorService;

    @Autowired
    private InquiryRepository inquiryRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private VendorAssignmentRepository assignmentRepository;

    private Event event;

    @BeforeEach
    void setUp() {
        Inquiry inquiry = Inquiry.builder()
                .clientId(1L)
                .clientName("Rollup Test Client")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(45))
                .expectedAttendees(150)
                .status(EventStatus.EVENT_CREATED)
                .build();
        inquiry = inquiryRepository.save(inquiry);

        event = Event.builder()
                .inquiry(inquiry)
                .name("Rollup Test Event")
                .requiredCategories("av,catering,security")
                .status(EventStatus.AWAITING_VENDORS)
                .build();
        event = eventRepository.save(event);
    }

    // ============ FIXTURE HELPERS ============

    private Vendor vendor(String name, String category) {
        return vendorRepository.save(Vendor.builder()
                .companyName(name)
                .serviceCategory(category)
                .rating(4.0)
                .insuranceExpiryDate(LocalDate.now().plusYears(1))
                .isActive(true)
                .build());
    }

    private VendorAssignment assignment(String category, Vendor v, VendorAssignmentStatus status) {
        return assignmentRepository.save(VendorAssignment.builder()
                .event(event)
                .vendor(v)
                .vendorName(v.getCompanyName())
                .serviceCategory(category)
                .status(status)
                .build());
    }

    // ============ TESTS ============

    @Test
    @DisplayName("Event moves to NEEDS_COORDINATOR when one category is stuck while others are pending")
    void eventRollsUpToNeedsCoordinatorWhenOneCategoryStuck() {
        // av: PENDING, catering: DECLINED (stuck), security: unassigned
        assignment("av", vendor("AV Pros", "av"), VendorAssignmentStatus.PENDING);
        assignment("catering", vendor("Cater Co", "catering"), VendorAssignmentStatus.DECLINED);

        // Coordinator fills the missing category; the rollup must still see
        // the stuck catering category and fail fast to NEEDS_COORDINATOR.
        Vendor securityVendor = vendor("Guard Corp", "security");
        vendorService.manualAssign(event.getId(), "security", securityVendor.getId());

        Event reloaded = eventRepository.findById(event.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EventStatus.NEEDS_COORDINATOR);
    }

    @Test
    @DisplayName("Event returns to AWAITING_VENDORS when a stuck category is resolved")
    void eventReturnsToAwaitingVendorsAfterStuckCategoryResolved() {
        // Event in NEEDS_COORDINATOR: av + security PENDING, catering unassigned (stuck)
        event.setStatus(EventStatus.NEEDS_COORDINATOR);
        event = eventRepository.save(event);
        assignment("av", vendor("AV Pros", "av"), VendorAssignmentStatus.PENDING);
        assignment("security", vendor("Guard Corp", "security"), VendorAssignmentStatus.PENDING);

        // Coordinator resolves the stuck category via manual assignment
        Vendor cateringVendor = vendor("Cater Co", "catering");
        vendorService.manualAssign(event.getId(), "catering", cateringVendor.getId());

        Event reloaded = eventRepository.findById(event.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EventStatus.AWAITING_VENDORS);
    }

    @Test
    @DisplayName("Event moves to CONFIRMED when the last stuck category is resolved")
    void eventConfirmsAfterLastStuckCategoryResolved() {
        // Event in NEEDS_COORDINATOR: av + security ACCEPTED, catering still in flight.
        // The rollup only confirms once every required category is ACCEPTED, so the
        // last outstanding category must be resolved all the way through to ACCEPTED.
        // That produces NEEDS_COORDINATOR -> CONFIRMED (authorized for Role.VENDOR),
        // the transition the rollup added to keep the state machine honest.
        event.setStatus(EventStatus.NEEDS_COORDINATOR);
        event = eventRepository.save(event);
        assignment("av", vendor("AV Pros", "av"), VendorAssignmentStatus.ACCEPTED);
        assignment("security", vendor("Guard Corp", "security"), VendorAssignmentStatus.ACCEPTED);
        VendorAssignment pendingCatering = assignment(
                "catering", vendor("Cater Co", "catering"), VendorAssignmentStatus.PENDING);

        vendorService.respondToAssignment(pendingCatering.getId(), "ACCEPTED", null);

        Event reloaded = eventRepository.findById(event.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EventStatus.CONFIRMED);
    }

    @Test
    @DisplayName("Event returns to AWAITING_VENDORS when a vendor claims the stuck category")
    void eventUnsticksWhenVendorClaimsOpenAssignment() {
        // Event in NEEDS_COORDINATOR: av + security PENDING, catering OPEN (stuck).
        // The vendor-driven claim produces NEEDS_COORDINATOR -> AWAITING_VENDORS,
        // so this transition must be authorized for Role.VENDOR.
        event.setStatus(EventStatus.NEEDS_COORDINATOR);
        event = eventRepository.save(event);
        assignment("av", vendor("AV Pros", "av"), VendorAssignmentStatus.PENDING);
        assignment("security", vendor("Guard Corp", "security"), VendorAssignmentStatus.PENDING);
        VendorAssignment openCatering = assignment(
                "catering", vendor("Cater Co", "catering"), VendorAssignmentStatus.OPEN);

        Vendor claimer = vendor("Second Cater", "catering");
        vendorService.claimOpenAssignment(openCatering.getId(), claimer.getId());

        Event reloaded = eventRepository.findById(event.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EventStatus.AWAITING_VENDORS);
    }

    @Test
    @DisplayName("Exhausted ranked list leaves the decline intact and opens a separate pool row")
    void declinedAttemptSurvivesAndPoolRowIsOpened() {
        assignment("av", vendor("AV Pros", "av"), VendorAssignmentStatus.PENDING);
        assignment("security", vendor("Guard Corp", "security"), VendorAssignmentStatus.PENDING);
        Vendor cateringVendor = vendor("Cater Co", "catering");
        VendorAssignment catering = assignment(
                "catering", cateringVendor, VendorAssignmentStatus.PENDING);

        // Vendor declines and no alternative catering vendor exists, so the ranked
        // list is exhausted and the category goes to the pool.
        VendorAssignment responded = vendorService.respondToAssignment(
                catering.getId(), "DECLINED", "Fully booked");

        // The decline is a permanent historical fact. It used to be recycled into
        // the pool row and then overwritten by whoever claimed it, which deleted
        // the attempt from the trail and from findTriedVendorIds.
        assertThat(responded.getStatus()).isEqualTo(VendorAssignmentStatus.DECLINED);
        assertThat(responded.getVendor().getId()).isEqualTo(cateringVendor.getId());
        assertThat(responded.getDeclineReason()).isEqualTo("Fully booked");

        // The pool offer is a separate row belonging to nobody.
        List<VendorAssignment> attempts =
                assignmentRepository.findByEventIdAndServiceCategory(event.getId(), "catering");
        assertThat(attempts).hasSize(2);

        VendorAssignment poolRow = attempts.stream()
                .max(Comparator.comparing(VendorAssignment::getId))
                .orElseThrow();
        assertThat(poolRow.getStatus()).isEqualTo(VendorAssignmentStatus.OPEN);
        assertThat(poolRow.getVendor()).isNull();
        assertThat(poolRow.getSelectionReason()).isEqualTo(SelectionReason.POOL_OPENED);

        Event reloaded = eventRepository.findById(event.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EventStatus.NEEDS_COORDINATOR);
        assertThat(reloaded.getUnfilledCategories()).contains("catering");
    }
}
