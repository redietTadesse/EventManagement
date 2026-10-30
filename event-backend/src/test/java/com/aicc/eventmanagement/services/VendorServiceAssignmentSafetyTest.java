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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendorServiceAssignmentSafetyTest {

    @Mock private VendorRepository vendorRepository;
    @Mock private VendorBookedDateRepository bookedDateRepository;
    @Mock private VendorAssignmentRepository assignmentRepository;
    @Mock private EventRepository eventRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private WorkflowEngine workflowEngine;
    @Mock private VendorRankingService rankingService;
    @Mock private VendorRatingService ratingService;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private VendorService vendorService;

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
    void manualAssignmentRejectsInactiveVendor() {
        Event event = event();
        Vendor vendor = vendor(4L, "av", false, event.getInquiry().getEventDate().plusDays(1));
        stubEventAndVendor(event, vendor);

        assertThatThrownBy(() -> vendorService.manualAssign(1L, "av", 4L, "Reason", 9L, "coord"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Inactive");
    }

    @Test
    void manualAssignmentRejectsWrongCategoryAndInvalidInsurance() {
        Event event = event();
        LocalDate eventDate = event.getInquiry().getEventDate();
        Vendor wrongCategory = vendor(4L, "catering", true, eventDate.plusDays(1));
        stubEventAndVendor(event, wrongCategory);
        assertThatThrownBy(() -> vendorService.manualAssign(1L, "av", 4L, "Reason", 9L, "coord"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("service category");

        Vendor expiredInsurance = vendor(5L, "av", true, eventDate.minusDays(1));
        when(vendorRepository.findById(5L)).thenReturn(Optional.of(expiredInsurance));
        assertThatThrownBy(() -> vendorService.manualAssign(1L, "av", 5L, "Reason", 9L, "coord"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("insurance");

        Vendor missingInsurance = vendor(6L, "av", true, null);
        when(vendorRepository.findById(6L)).thenReturn(Optional.of(missingInsurance));
        assertThatThrownBy(() -> vendorService.manualAssign(1L, "av", 6L, "Reason", 9L, "coord"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not on file");
    }

    @Test
    void manualAssignmentStoresTheReasonAndCoordinatorIdentity() {
        Event event = event();
        Vendor vendor = vendor(4L, "av", true, event.getInquiry().getEventDate().plusDays(1));
        stubEventAndVendor(event, vendor);
        when(bookedDateRepository.existsByVendorIdAndBookedDate(4L, event.getInquiry().getEventDate())).thenReturn(false);
        when(assignmentRepository.hasActiveAssignmentOnDate(4L, event.getInquiry().getEventDate())).thenReturn(false);
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
        when(rankingService.selectForEvent(1L, "av", event.getInquiry().getEventDate()))
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
        when(rankingService.selectForEvent(1L, "av", event.getInquiry().getEventDate()))
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
