package com.aicc.eventmanagement.integration;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.payload.DashboardUpcomingEvent;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DashboardUpcomingEventsTest {
    @Autowired private EventRepository eventRepository;
    @Autowired private InquiryRepository inquiryRepository;

    @Test
    void projectionIncludesInclusiveRangeAndAllNonterminalEventStatuses() {
        LocalDate start = LocalDate.now().plusDays(20);
        LocalDate end = start.plusDays(6);
        for (EventStatus status : EventStatus.values()) {
            LocalDate date = status.ordinal() % 2 == 0 ? start : end;
            Inquiry inquiry = inquiryRepository.save(Inquiry.builder()
                    .clientId(7L).clientName("Dashboard client").eventType("Conference")
                    .eventDate(date).expectedAttendees(120).status(status).build());
            eventRepository.save(Event.builder().inquiry(inquiry).name(status.name())
                    .venue("Main Hall").status(status).build());
        }
        Inquiry outside = inquiryRepository.save(Inquiry.builder()
                .clientId(7L).clientName("Outside client").eventType("Conference")
                .eventDate(start.minusDays(1)).expectedAttendees(60).status(EventStatus.EVENT_CREATED).build());
        eventRepository.save(Event.builder().inquiry(outside).name("Outside range")
                .status(EventStatus.EVENT_CREATED).build());

        List<DashboardUpcomingEvent> result = eventRepository.findDashboardUpcomingEvents(start, end,
                List.of(EventStatus.CANCELLED, EventStatus.COMPLETED, EventStatus.CLOSED));

        assertThat(result).hasSize(EventStatus.values().length - 3)
                .extracting(DashboardUpcomingEvent::status)
                .containsExactlyInAnyOrder(EventStatus.INQUIRY_SUBMITTED, EventStatus.PROPOSAL_SENT,
                        EventStatus.PROPOSAL_ACCEPTED, EventStatus.PROPOSAL_REJECTED, EventStatus.EVENT_CREATED,
                        EventStatus.AWAITING_VENDORS, EventStatus.NEEDS_COORDINATOR, EventStatus.CONFIRMED);
        assertThat(result).allSatisfy(event -> {
            assertThat(event.clientName()).isEqualTo("Dashboard client");
            assertThat(event.expectedAttendees()).isEqualTo(120);
        });
    }
}
