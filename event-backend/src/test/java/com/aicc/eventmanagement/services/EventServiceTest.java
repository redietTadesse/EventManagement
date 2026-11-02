package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.List;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("EventService Unit Tests")
class EventServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private InquiryRepository inquiryRepository;

    @Mock
    private VendorService vendorService;

    @Mock
    private ChecklistService checklistService;

    @Mock
    private WorkflowEngine workflowEngine;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private EventService eventService;

    @Test
    @DisplayName("EventService rejects invalid status transitions")
    void eventServiceRejectsInvalidTransition() {
        Event event = Event.builder()
                .id(1L)
                .name("Conference")
                .status(EventStatus.CONFIRMED)
                .build();

        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        doThrow(new IllegalStateException(
                "Invalid transition: CONFIRMED -> INQUIRY_SUBMITTED is not allowed."))
                .when(workflowEngine).validateTransition(
                EventStatus.CONFIRMED,
                EventStatus.INQUIRY_SUBMITTED,
                Role.COORDINATOR
        );

        assertThatThrownBy(() -> eventService.updateEventStatus(
                1L,
                EventStatus.INQUIRY_SUBMITTED,
                Role.COORDINATOR
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Invalid transition");

        verify(workflowEngine).validateTransition(
                EventStatus.CONFIRMED,
                EventStatus.INQUIRY_SUBMITTED,
                Role.COORDINATOR
        );
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("Readiness preserves the existing 20 percent checklist contribution")
    void checklistReadinessContributionRemainsTwentyPercent() {
        Event event = Event.builder()
                .id(2L)
                .inquiry(Inquiry.builder().id(3L).eventDate(LocalDate.of(2027, 8, 10)).build())
                .name("Checklist readiness")
                .status(EventStatus.EVENT_CREATED)
                .build();
        Checklist complete = Checklist.builder().id(20L).event(event).itemName("Complete").isComplete(true).build();
        Checklist blocked = Checklist.builder().id(21L).event(event).itemName("Blocked").isComplete(false).build();

        when(eventRepository.findById(2L)).thenReturn(Optional.of(event));
        when(vendorService.getRequiredCategoriesFor(event)).thenReturn(List.of());
        when(vendorService.getAssignmentsByEvent(2L)).thenReturn(List.of());
        when(checklistService.getChecklistByEvent(2L)).thenReturn(List.of(complete, blocked));

        var readiness = eventService.getEventReadiness(2L);

        assertThat(readiness.getReadinessPercentage()).isEqualTo(10);
        assertThat(readiness.getCompletedChecklistItems()).isEqualTo(1);
        assertThat(readiness.getTotalChecklistItems()).isEqualTo(2);
    }
}
