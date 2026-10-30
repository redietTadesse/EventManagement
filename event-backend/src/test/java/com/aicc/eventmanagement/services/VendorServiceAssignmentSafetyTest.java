package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.SelectionReason;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.payload.VendorTrailResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VendorServiceAssignmentSafetyTest {

    @Mock private VendorRepository vendorRepository;
    @Mock private VendorBookedDateRepository bookedDateRepository;
    @Mock private VendorAssignmentRepository assignmentRepository;
    @Mock private EventRepository eventRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private WorkflowEngine workflowEngine;
    @Mock private VendorRankingService rankingService;
    @Mock private VendorEligibilityService eligibilityService;
    @Mock private VendorRatingService ratingService;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private VendorService vendorService;

    @BeforeEach
    void allowEligibleVendorByDefault() {
        when(eligibilityService.evaluate(any(), anyString(), any(), any(), anyString(), anySet()))
                .thenReturn(new VendorEligibilityService.EligibilityResult(true, null, null));
    }

    private Event event() {
        Inquiry inquiry = Inquiry.builder()
                .id(2L)
                .eventType("conference")
                .eventDate(LocalDate.of(2027, 2, 1))
                .build();
        return Event.builder()
                .id(1L)
                .name("Test event")
                .status(EventStatus.AWAITING_VENDORS)
                .requiredCategories("av")
                .inquiry(inquiry)
                .build();
    }

    private Vendor vendor(Long id, String category, boolean active, LocalDate insuranceExpiry) {
        return Vendor.builder()
                .id(id)
                .companyName("Vendor " + id)
                .serviceCategory(category)
                .isActive(active)
                .insuranceExpiryDate(insuranceExpiry)
                .build();
    }

    private void stubEventAndVendor(Event event, Vendor vendor) {
        when(eventRepository.findById(event.getId())).thenReturn(Optional.of(event));
        when(vendorRepository.findById(vendor.getId())).thenReturn(Optional.of(vendor));
    }

    @Test
    void manualAssignmentSurfacesTheSharedEligibilityDecision() {
        Event event = event();
        Vendor vendor = vendor(4L, "av", true, event.getInquiry().getEventDate().plusDays(1));
        stubEventAndVendor(event, vendor);
        when(eligibilityService.evaluate(vendor, "av", event.getInquiry().getEventDate(), 1L,
                "conference", java.util.Set.of())).thenReturn(
                new VendorEligibilityService.EligibilityResult(false, "VENDOR_INACTIVE", "Inactive vendor"));

        assertThatThrownBy(() -> vendorService.manualAssign(1L, "av", 4L, "Reason", 9L, "coord"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Inactive");
    }

    @Test
    void manualAssignmentAllowsMissingInsuranceWhenSharedPolicyAllowsIt() {
        Event event = event();
        Vendor vendor = vendor(4L, "av", true, null);
        stubEventAndVendor(event, vendor);
        when(eligibilityService.evaluate(vendor, "av", event.getInquiry().getEventDate(), 1L,
                "conference", java.util.Set.of())).thenReturn(
                new VendorEligibilityService.EligibilityResult(true, null, null));
        when(assignmentRepository.findByEventIdAndServiceCategory(1L, "av")).thenReturn(List.of());
        when(assignmentRepository.save(any(VendorAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(assignmentRepository.findByEventId(1L)).thenReturn(List.of());

        var assignment = vendorService.manualAssign(1L, "av", 4L, "Reason", 9L, "coord");

        assertThat(assignment.getStatus()).isEqualTo(VendorAssignmentStatus.PENDING);
    }

    @Test
    void manualAssignmentStoresTheReasonAndCoordinatorIdentity() {
        Event event = event();
        Vendor vendor = vendor(4L, "av", true, event.getInquiry().getEventDate().plusDays(1));
        stubEventAndVendor(event, vendor);
        when(assignmentRepository.findByEventIdAndServiceCategory(1L, "av")).thenReturn(List.of());

        AtomicReference<VendorAssignment> saved = new AtomicReference<>();
        when(assignmentRepository.save(any(VendorAssignment.class))).thenAnswer(invocation -> {
            VendorAssignment assignment = invocation.getArgument(0);
            assignment.setId(12L);
            saved.set(assignment);
            return assignment;
        });
        when(assignmentRepository.findByEventId(1L)).thenAnswer(invocation ->
                saved.get() == null ? List.of() : List.of(saved.get()));

        VendorAssignment assignment = vendorService.manualAssign(
                1L, "av", 4L, "Client requested their usual AV vendor", 9L, "coordinator.user");

        assertThat(assignment.getSelectionReason()).isEqualTo(SelectionReason.COORDINATOR_MANUAL);
        assertThat(assignment.getDecisionSnapshot())
                .contains("Client requested their usual AV vendor")
                .contains("coordinator.user")
                .contains("\"userId\":9");
        verify(eventRepository).save(event);
    }

    @Test
    void reassignmentPersistsTheSelectedDecisionSnapshotAndExposesItInTrail() {
        Event event = event();
        Vendor oldVendor = vendor(3L, "av", true, event.getInquiry().getEventDate().plusDays(2));
        Vendor replacement = vendor(4L, "av", true, event.getInquiry().getEventDate().plusDays(2));
        VendorAssignment failed = VendorAssignment.builder()
                .id(10L).event(event).vendor(oldVendor).vendorName(oldVendor.getCompanyName())
                .serviceCategory("av").status(VendorAssignmentStatus.DECLINED)
                .selectionReason(SelectionReason.TOP_RATED).build();
        String snapshot = "{\"selectedVendorId\":4,\"considered\":[{\"vendorName\":\"Vendor 4\",\"score\":82.5,\"status\":\"Selected\"}]}";
        when(rankingService.selectForEvent(1L, "conference", "av", event.getInquiry().getEventDate()))
                .thenReturn(Optional.of(new VendorRankingService.Selection(
                        replacement, 0.825, SelectionReason.LEAST_LOADED, snapshot)));
        when(assignmentRepository.save(any(VendorAssignment.class))).thenAnswer(invocation -> {
            VendorAssignment assignment = invocation.getArgument(0);
            assignment.setId(11L);
            return assignment;
        });

        vendorService.advanceAfterFailedAttempt(failed, Role.VENDOR);

        ArgumentCaptor<VendorAssignment> captor = ArgumentCaptor.forClass(VendorAssignment.class);
        verify(assignmentRepository).save(captor.capture());
        VendorAssignment reassigned = captor.getValue();
        assertThat(reassigned.getVendor()).isSameAs(replacement);
        assertThat(reassigned.getDecisionSnapshot()).isEqualTo(snapshot);

        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(assignmentRepository.findByEventId(1L)).thenReturn(List.of(failed, reassigned));
        VendorTrailResponse.Attempt latest = vendorService.getVendorTrail(1L)
                .categories().get(0).attempts().get(1);
        assertThat(latest.decisionSnapshot()).isEqualTo(snapshot);
    }

    @Test
    void exhaustedRankingOpensAnUnclaimedPoolAttempt() {
        Event event = event();
        Vendor oldVendor = vendor(3L, "av", true, event.getInquiry().getEventDate().plusDays(2));
        VendorAssignment failed = VendorAssignment.builder()
                .id(10L).event(event).vendor(oldVendor).vendorName(oldVendor.getCompanyName())
                .serviceCategory("av").status(VendorAssignmentStatus.DECLINED).build();
        when(rankingService.selectForEvent(1L, "conference", "av", event.getInquiry().getEventDate()))
                .thenReturn(Optional.empty());
        when(assignmentRepository.findByEventIdAndServiceCategory(1L, "av")).thenReturn(List.of(failed));
        ArgumentCaptor<VendorAssignment> captor = ArgumentCaptor.forClass(VendorAssignment.class);

        vendorService.advanceAfterFailedAttempt(failed, Role.VENDOR);

        verify(assignmentRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(VendorAssignmentStatus.OPEN);
        assertThat(captor.getValue().getVendor()).isNull();
        assertThat(event.getUnfilledCategories()).isEqualTo("av");
    }
}
