package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.payload.DashboardUpcomingEvent;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {
    @Mock private UserRepository userRepository;
    @Mock private VendorRepository vendorRepository;
    @Mock private EventRepository eventRepository;
    @Mock private InquiryRepository inquiryRepository;
    @Mock private VendorAssignmentRepository assignmentRepository;
    @InjectMocks private DashboardService dashboardService;

    @Test
    void upcomingEventsUsesInclusiveDatesAndExcludesTerminalStatuses() {
        LocalDate start = LocalDate.of(2026, 10, 30);
        LocalDate end = LocalDate.of(2026, 11, 5);
        List<DashboardUpcomingEvent> expected = List.of();
        when(eventRepository.findDashboardUpcomingEvents(start, end,
                List.of(EventStatus.CANCELLED, EventStatus.COMPLETED, EventStatus.CLOSED))).thenReturn(expected);

        assertEquals(expected, dashboardService.getUpcomingEvents(start, end));
        verify(eventRepository).findDashboardUpcomingEvents(start, end,
                List.of(EventStatus.CANCELLED, EventStatus.COMPLETED, EventStatus.CLOSED));
    }
}
