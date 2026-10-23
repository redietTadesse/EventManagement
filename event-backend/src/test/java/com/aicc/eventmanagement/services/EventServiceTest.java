package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
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
}
