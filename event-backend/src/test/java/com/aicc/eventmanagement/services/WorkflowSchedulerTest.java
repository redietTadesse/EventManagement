package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.repositories.EventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate;
import java.util.List;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowSchedulerTest {
    @Mock EventRepository events;
    @Mock EventService service;
    @Mock VendorService vendors;
    @InjectMocks WorkflowScheduler scheduler;

    @Test
    void oneFailedCompletionDoesNotPreventTheNextEventFromCompleting() {
        when(events.findPastEventsByStatus(EventStatus.CONFIRMED, LocalDate.now()))
                .thenReturn(List.of(Event.builder().id(1L).build(), Event.builder().id(2L).build()));
        doThrow(new IllegalStateException("Concurrent event change")).when(service)
                .updateEventStatus(1L, EventStatus.COMPLETED, Role.ADMIN);
        scheduler.autoCompletePastEvents();
        verify(service).updateEventStatus(2L, EventStatus.COMPLETED, Role.ADMIN);
    }
}
