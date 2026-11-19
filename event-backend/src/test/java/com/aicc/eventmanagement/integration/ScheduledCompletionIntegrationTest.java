package com.aicc.eventmanagement.integration;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.services.WorkflowScheduler;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ScheduledCompletionIntegrationTest {
    @Autowired EventRepository events;
    @Autowired InquiryRepository inquiries;
    @Autowired VendorAssignmentRepository assignments;
    @Autowired WorkflowScheduler scheduler;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entityManager;

    @Test
    void completionUsesEndDateCompletesAcceptedWorkAndPreservesFailedAttempts() {
        Event ended = eventEnding(LocalDate.now().minusDays(1));
        Event ongoing = eventEnding(LocalDate.now().plusDays(1));
        Event endingToday = eventEnding(LocalDate.now());
        Event singleDay = eventEnding(null);
        Long accepted = assignment(ended, VendorAssignmentStatus.ACCEPTED);
        Long declined = assignment(ended, VendorAssignmentStatus.DECLINED);
        Long ongoingWork = assignment(ongoing, VendorAssignmentStatus.ACCEPTED);
        Long singleDayWork = assignment(singleDay, VendorAssignmentStatus.ACCEPTED);
        entityManager.flush();
        entityManager.clear();

        scheduler.autoCompletePastEvents();
        entityManager.flush();
        entityManager.clear();

        assertThat(events.findById(ended.getId()).orElseThrow().getStatus()).isEqualTo(EventStatus.COMPLETED);
        assertThat(events.findById(singleDay.getId()).orElseThrow().getStatus()).isEqualTo(EventStatus.COMPLETED);
        assertThat(events.findById(ongoing.getId()).orElseThrow().getStatus()).isEqualTo(EventStatus.CONFIRMED);
        assertThat(events.findById(endingToday.getId()).orElseThrow().getStatus()).isEqualTo(EventStatus.CONFIRMED);
        assertThat(assignments.findById(accepted).orElseThrow().getStatus()).isEqualTo(VendorAssignmentStatus.COMPLETED);
        assertThat(assignments.findById(singleDayWork).orElseThrow().getStatus()).isEqualTo(VendorAssignmentStatus.COMPLETED);
        assertThat(assignments.findById(declined).orElseThrow().getStatus()).isEqualTo(VendorAssignmentStatus.DECLINED);
        assertThat(assignments.findById(ongoingWork).orElseThrow().getStatus()).isEqualTo(VendorAssignmentStatus.ACCEPTED);

        scheduler.autoCompletePastEvents();
        assertThat(events.findPastEventsByStatus(EventStatus.CONFIRMED, LocalDate.now())).isEmpty();
    }

    private Event eventEnding(LocalDate endDate) {
        Inquiry inquiry = inquiries.saveAndFlush(Inquiry.builder().clientId(7L).clientName("Completion test")
                .eventType("Conference").eventDate(LocalDate.now().plusDays(5)).endDate(endDate)
                .expectedAttendees(20).status(EventStatus.EVENT_CREATED).build());
        // Time has passed since submission; avoid changing the public future-date validation.
        jdbc.update("update inquiries set event_date = ? where id = ?", LocalDate.now().minusDays(3), inquiry.getId());
        return events.saveAndFlush(Event.builder().name("Scheduled completion test").inquiry(inquiry)
                .status(EventStatus.CONFIRMED).build());
    }

    private Long assignment(Event event, VendorAssignmentStatus status) {
        return assignments.saveAndFlush(VendorAssignment.builder().event(event).serviceCategory("av")
                .vendorName("Completion test vendor").status(status).build()).getId();
    }
}
