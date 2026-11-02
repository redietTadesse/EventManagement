package com.aicc.eventmanagement.integration;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.entities.VenueBooking;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.repositories.ChecklistRepository;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.aicc.eventmanagement.repositories.VenueBookingRepository;
import com.aicc.eventmanagement.repositories.VenueRepository;
import com.aicc.eventmanagement.security.JwtUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpMethod.PATCH;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.http.HttpMethod.PUT;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real controllers, JWT authorization, services and persistence. Deliberately has
 * no test-wide transaction: every HTTP action must commit and serialize on its own.
 * Reference users/venues/vendors are fixtures; all lifecycle operations use the API.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:lifecycle-http;DB_CLOSE_DELAY=-1",
        "spring.jpa.open-in-view=false",
        "app.email.enabled=false"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EventLifecycleApiIntegrationTest {
    @Autowired private MockMvc http;
    @Autowired private ObjectMapper json;
    @Autowired private JwtUtils jwt;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository users;
    @Autowired private VendorRepository vendors;
    @Autowired private VenueRepository venues;
    @Autowired private EventRepository events;
    @Autowired private InquiryRepository inquiries;
    @Autowired private ChecklistRepository tasks;
    @Autowired private VendorAssignmentRepository assignments;
    @Autowired private VenueBookingRepository bookings;

    private String run;
    private LocalDate date;
    private User client;
    private User coordinator;
    private Venue venue;

    @BeforeEach
    void referenceData() throws Exception {
        try (var connection = jdbc.getDataSource().getConnection()) {
            assertThat(connection.getMetaData().getURL()).startsWith("jdbc:h2:mem:lifecycle-http");
        }
        // Prior scenarios stay available for audit assertions but cannot alter this ranking.
        jdbc.update("UPDATE vendors SET is_active = false");
        run = UUID.randomUUID().toString().substring(0, 8);
        date = LocalDate.now().plusDays(90);
        client = user("client", Role.CLIENT);
        coordinator = user("coordinator", Role.COORDINATOR);
        venue = venues.save(Venue.builder().name("Lifecycle Hall " + run).capacity(300)
                .setupBufferDays(1).teardownBufferDays(1).active(true).build());
    }

    @Test
    void dashboardAndVenueBookingsSerializeAfterRequestTransactionsClose() throws Exception {
        vendor("AV", "av", 4.0, date.plusYears(1));
        long event = convert(acceptedInquiry(), 200).path("id").asLong();
        JsonNode dashboard = call(GET, "/coordinator/action-required", coordinator, null, 200);
        assertThat(nodes(dashboard.path("needsCoordinatorEvents"))).anySatisfy(item -> {
            assertThat(item.path("id").asLong()).isEqualTo(event);
            assertThat(item.path("eventDate").asText()).isEqualTo(date.toString());
            assertThat(item.has("inquiry")).isFalse();
        });
        JsonNode booked = call(GET, "/venues/" + venue.getId() + "/bookings", coordinator, null, 200);
        assertThat(nodes(booked)).hasSize(4).allSatisfy(item -> {
            assertThat(item.path("eventId").asLong()).isEqualTo(event);
            assertThat(item.path("venueName").asText()).isEqualTo(venue.getName());
        });
        JsonNode clientEvent = call(GET, "/events/" + event, client, null, 200);
        assertThat(clientEvent.path("venue").asText()).isEqualTo(venue.getName());
        assertThat(clientEvent.path("endDate").asText()).isEqualTo(date.plusDays(1).toString());
    }

    @Test
    void adminVendorEditsPersistOnTheVendorRatherThanTheUserIdentifier() throws Exception {
        User admin = user("admin", Role.ADMIN);
        VendorActor actor = vendor("Original company", "av", 4.0, date.plusYears(1));
        long id = actor.vendor().getId();
        call(PUT, "/vendors/" + id, admin, Map.of("companyName", "Edited company " + run,
                "serviceCategory", "security", "description", "Updated services", "phone", "0912345678",
                "insuranceExpiryDate", date.plusYears(2).toString()), 200);
        JsonNode saved = call(GET, "/vendors/" + id, admin, null, 200);
        assertThat(saved.path("companyName").asText()).isEqualTo("Edited company " + run);
        assertThat(saved.path("serviceCategory").asText()).isEqualTo("security");
        assertThat(saved.path("description").asText()).isEqualTo("Updated services");
        assertThat(saved.path("active").asBoolean()).isTrue();
        assertThat(saved.path("userId").asLong()).isEqualTo(actor.user().getId());
        Map<String, Object> clearInsurance = new java.util.HashMap<>();
        clearInsurance.put("insuranceExpiryDate", null);
        call(PUT, "/vendors/" + id, admin, clearInsurance, 200);
        assertThat(call(GET, "/vendors/" + id, admin, null, 200).path("insuranceExpiryDate").isNull()).isTrue();
    }

    @Test
    void proposalConversionReplacementTasksRescheduleAndCompletionWorkAcrossRequests() throws Exception {
        VendorActor firstAv = vendor("First AV", "av", 5.0, date.plusYears(1));
        VendorActor nextAv = vendor("Replacement AV", "av", 4.0, date.plusYears(1));
        VendorActor security = vendor("Security", "security", 4.5, date.plusYears(1));
        VendorActor expiredAv = vendor("Expired AV", "av", 5.0, date.minusDays(1));
        long offersBefore = assignments.count();
        long inquiry = acceptedInquiry();

        JsonNode preview = call(GET, "/inquiries/" + inquiry + "/conversion-preview", coordinator, null, 200);
        assertThat(preview.path("venue").path("available").asBoolean()).isTrue();
        JsonNode avPreview = byCategory(preview.path("categories"), "av");
        assertThat(avPreview.path("candidates").get(0).path("vendorId").asLong()).isEqualTo(firstAv.vendor().getId());
        assertThat(nodes(avPreview.path("excludedCandidates"))).anySatisfy(candidate -> {
            assertThat(candidate.path("vendorId").asLong()).isEqualTo(expiredAv.vendor().getId());
            assertThat(candidate.path("reason").asText()).containsIgnoringCase("insurance");
        });
        assertThat(assignments.count()).isEqualTo(offersBefore);

        long event = convert(inquiry, 200).path("id").asLong();
        assertEventStatus(event, "AWAITING_VENDORS");
        assertThat(call(GET, "/inquiries/" + inquiry, client, null, 200).path("event").path("id").asLong()).isEqualTo(event);
        assertThat(nodes(call(GET, "/inquiries", coordinator, null, 200)))
                .anySatisfy(item -> assertThat(item.path("id").asLong()).isEqualTo(inquiry));
        JsonNode listed = nodes(call(GET, "/events", coordinator, null, 200)).stream()
                .filter(item -> item.path("id").asLong() == event).findFirst().orElseThrow();
        assertThat(listed.path("clientName").asText()).isEqualTo(client.getFullName());
        assertThat(listed.path("eventDate").asText()).isEqualTo(date.toString());
        assertThat(listed.path("endDate").asText()).isEqualTo(date.plusDays(1).toString());
        assertThat(listed.path("venueId").asLong()).isEqualTo(venue.getId());
        assertThat(nodes(listed.path("requiredCategories"))).extracting(JsonNode::asText).containsExactly("av", "security");
        assertThat(bookings.findByEventId(event)).hasSize(4)
                .allSatisfy(booking -> assertThat(booking.getStatus()).isEqualTo(VenueBooking.BookingStatus.CONFIRMED));

        JsonNode initialTasks = checklist(event);
        assertThat(initialTasks.size()).isEqualTo(5);
        JsonNode hall = nodes(initialTasks).stream().filter(item -> item.path("itemName").asText().equals("Book main hall")).findFirst().orElseThrow();
        JsonNode avTask = nodes(initialTasks).stream().filter(item -> item.path("itemName").asText().equals("Arrange AV equipment")).findFirst().orElseThrow();
        long hallId = hall.path("id").asLong();
        LocalDate override = date.minusDays(5);
        call(PUT, "/checklists/" + hallId, coordinator,
                Map.of("itemName", "Coordinator venue review", "dueDate", override.toString()), 200);
        long dependent = call(POST, "/checklists", coordinator, Map.of("eventId", event,
                "itemName", "Client walkthrough", "ownerRole", "COORDINATOR", "dueDate", date.minusDays(2).toString(),
                "dependencyIds", List.of(hallId)), 201).path("id").asLong();
        JsonNode blocked = call(PATCH, "/checklists/" + dependent + "/complete", coordinator, null, 400);
        assertThat(blocked.path("code").asText()).isEqualTo("CHECKLIST_DEPENDENCIES_INCOMPLETE");
        call(PATCH, "/checklists/" + hallId + "/complete", coordinator, null, 200);
        call(PATCH, "/checklists/" + dependent + "/complete", coordinator, null, 200);
        JsonNode regenerated = call(POST, "/checklists/event/" + event + "/generate", coordinator, null, 200);
        assertThat(regenerated.size()).isEqualTo(6);
        assertThat(task(regenerated, hallId).path("itemName").asText()).isEqualTo("Coordinator venue review");
        assertThat(task(regenerated, hallId).path("dueDate").asText()).isEqualTo(override.toString());
        assertThat(task(regenerated, dependent).path("isComplete").asBoolean()).isTrue();

        JsonNode declined = currentOffer(event, "av");
        assertThat(declined.path("vendorId").asLong()).isEqualTo(firstAv.vendor().getId());
        assertThat(json.readTree(declined.path("decisionSnapshot").asText()).path("considered").size()).isPositive();
        respond(declined, firstAv.user(), "DECLINED");
        JsonNode replacement = currentOffer(event, "av");
        assertThat(replacement.path("id").asLong()).isNotEqualTo(declined.path("id").asLong());
        assertThat(replacement.path("vendorId").asLong()).isEqualTo(nextAv.vendor().getId());
        assertThat(replacement.path("status").asText()).isEqualTo("PENDING");
        assertThat(task(offers(event), declined.path("id").asLong()).path("status").asText()).isEqualTo("DECLINED");
        respond(currentOffer(event, "security"), security.user(), "ACCEPTED");
        assertEventStatus(event, "AWAITING_VENDORS");
        respond(replacement, nextAv.user(), "ACCEPTED");
        assertEventStatus(event, "CONFIRMED");
        JsonNode readiness = call(GET, "/events/" + event + "/readiness", coordinator, null, 200);
        assertThat(readiness.path("readinessPercentage").asInt()).isEqualTo(86); // 30 + 50 + floor(2/6 * 20)

        LocalDate newDate = date.plusDays(7);
        JsonNode impact = call(GET, "/events/" + event + "/impact?newDate=" + newDate, coordinator, null, 200);
        assertThat(impact.path("venueAvailable").asBoolean()).isTrue();
        assertThat(impact.path("needsReconfirmation").size()).isEqualTo(2);
        JsonNode changed = call(PUT, "/events/" + event + "/date?newDate=" + newDate, coordinator, null, 200);
        assertThat(changed.path("eventDate").asText()).isEqualTo(newDate.toString());
        assertThat(changed.path("endDate").asText()).isEqualTo(newDate.plusDays(1).toString());
        assertThat(changed.path("status").asText()).isEqualTo("AWAITING_VENDORS");
        assertThat(bookings.findByEventId(event).stream().filter(booking -> booking.getStatus() == VenueBooking.BookingStatus.CONFIRMED)
                .map(VenueBooking::getBookingDate).toList()).containsExactlyInAnyOrder(
                        newDate.minusDays(1), newDate, newDate.plusDays(1), newDate.plusDays(2));
        JsonNode rescheduledTasks = checklist(event);
        assertThat(task(rescheduledTasks, hallId).path("dueDate").asText()).isEqualTo(override.toString());
        assertThat(task(rescheduledTasks, dependent).path("dueDate").asText()).isEqualTo(date.minusDays(2).toString());
        assertThat(task(rescheduledTasks, avTask.path("id").asLong()).path("dueDate").asText()).isEqualTo(newDate.minusDays(14).toString());
        assertThat(task(rescheduledTasks, dependent).path("isComplete").asBoolean()).isTrue();
        respond(currentOffer(event, "av"), nextAv.user(), "ACCEPTED");
        respond(currentOffer(event, "security"), security.user(), "ACCEPTED");
        for (JsonNode task : nodes(checklist(event))) {
            if (!task.path("isComplete").asBoolean()) call(PATCH, "/checklists/" + task.path("id").asLong() + "/complete", coordinator, null, 200);
        }
        assertThat(call(GET, "/events/" + event + "/readiness", coordinator, null, 200).path("readinessPercentage").asInt()).isEqualTo(100);
        call(PATCH, "/events/" + event + "/status?status=COMPLETED", coordinator, null, 200);
        assertThat(currentOffer(event, "av").path("status").asText()).isEqualTo("COMPLETED");
        assertThat(currentOffer(event, "security").path("status").asText()).isEqualTo("COMPLETED");
        call(PATCH, "/events/" + event + "/status?status=CANCELLED", coordinator, null, 400);
        assertEventStatus(event, "COMPLETED");
        JsonNode history = call(GET, "/history/event/" + event, coordinator, null, 200);
        assertThat(nodes(history).stream().filter(entry -> entry.path("toStatus").asText().equals("CONFIRMED")).count()).isEqualTo(2);
        assertThat(nodes(history)).anySatisfy(entry -> {
            assertThat(entry.path("toStatus").asText()).isEqualTo("COMPLETED");
            assertThat(entry.path("performedByUsername").asText()).isEqualTo(coordinator.getUsername());
        });
        JsonNode trail = call(GET, "/events/" + event + "/vendor-trail", coordinator, null, 200);
        assertThat(byCategory(trail.path("categories"), "av").path("attempts").size()).isEqualTo(2);
    }

    @ParameterizedTest(name = "Exhausted pool recovers through {0} coordinator assignment")
    @ValueSource(strings = {"manual", "force"})
    void exhaustedPoolCanBeResolvedAndCancellationReleasesCommitments(String action) throws Exception {
        VendorActor av = vendor("Only AV", "av", 4.0, date.plusYears(1));
        VendorActor firstSecurity = vendor("First Security", "security", 4.0, date.plusYears(1));
        long event = convert(acceptedInquiry(), 200).path("id").asLong();
        assertEventStatus(event, "AWAITING_VENDORS");
        respond(currentOffer(event, "av"), av.user(), "ACCEPTED");
        JsonNode declined = currentOffer(event, "security");
        respond(declined, firstSecurity.user(), "DECLINED");
        assertEventStatus(event, "NEEDS_COORDINATOR");
        JsonNode pool = currentOffer(event, "security");
        assertThat(pool.path("status").asText()).isEqualTo("OPEN");
        VendorActor lateVendor = vendor("New Security", "security", 4.0, date.plusYears(1));
        String path = action.equals("force") ? "/assignments/" + pool.path("id").asLong() + "/force-assign"
                : "/assignments/event/" + event + "/manual";
        call(POST, path, coordinator, Map.of("vendorId", lateVendor.vendor().getId(), "category", "security", "reason", ""), 400);
        assertThat(currentOffer(event, "security").path("status").asText()).isEqualTo("OPEN");
        call(POST, path, coordinator, Map.of("vendorId", lateVendor.vendor().getId(), "category", "security",
                "reason", "New eligible vendor reviewed by coordinator"), 200);
        assertEventStatus(event, "AWAITING_VENDORS");
        assertThat(nodes(offers(event)).stream().filter(item -> item.path("serviceCategory").asText().equals("security")
                && item.path("status").asText().equals("PENDING")).count()).isEqualTo(1);
        respond(currentOffer(event, "security"), lateVendor.user(), "ACCEPTED");
        assertEventStatus(event, "CONFIRMED");
        call(PATCH, "/events/" + event + "/status?status=CANCELLED", coordinator, null, 200);
        assertThat(currentOffer(event, "av").path("status").asText()).isEqualTo("CANCELLED");
        assertThat(currentOffer(event, "security").path("status").asText()).isEqualTo("CANCELLED");
        assertThat(task(offers(event), declined.path("id").asLong()).path("status").asText()).isEqualTo("DECLINED");
        assertThat(bookings.findByEventId(event)).isNotEmpty()
                .allSatisfy(booking -> assertThat(booking.getStatus()).isEqualTo(VenueBooking.BookingStatus.CANCELLED));
        JsonNode history = call(GET, "/history/event/" + event, coordinator, null, 200);
        assertThat(nodes(history)).anySatisfy(entry -> {
            assertThat(entry.path("toStatus").asText()).isEqualTo("CANCELLED");
            assertThat(entry.path("performedByUsername").asText()).isEqualTo(coordinator.getUsername());
        });
    }

    @Test
    void conversionRechecksVenueAndRollsBackEveryNewRecordOnConflict() throws Exception {
        vendor("AV", "av", 4.0, date.plusYears(1));
        vendor("Security", "security", 4.0, date.plusYears(1));
        long first = acceptedInquiry();
        long second = acceptedInquiry(); // Both proposals were prepared before the venue was reserved.
        long firstEvent = convert(first, 200).path("id").asLong();
        long eventCount = events.count(), taskCount = tasks.count(), offerCount = assignments.count();
        JsonNode failure = convert(second, 400);
        assertThat(failure.path("code").asText()).isEqualTo("VENUE_CONFLICT");
        assertThat(events.findByInquiryId(second)).isEmpty();
        assertThat(events.count()).isEqualTo(eventCount);
        assertThat(tasks.count()).isEqualTo(taskCount);
        assertThat(assignments.count()).isEqualTo(offerCount);
        assertThat(inquiries.findById(second).orElseThrow().getStatus()).isEqualTo(EventStatus.PROPOSAL_ACCEPTED);
        assertThat(bookings.findByEventId(firstEvent)).hasSize(4)
                .allSatisfy(booking -> assertThat(booking.getStatus()).isEqualTo(VenueBooking.BookingStatus.CONFIRMED));
    }

    @Test
    void missingInitialServiceRemainsUnreadyUntilCoordinatorSendsAnOffer() throws Exception {
        VendorActor av = vendor("Available AV", "av", 4.0, date.plusYears(1));
        long event = convert(acceptedInquiry(), 200).path("id").asLong();
        assertEventStatus(event, "NEEDS_COORDINATOR");
        assertThat(offers(event).size()).isEqualTo(1);
        respond(currentOffer(event, "av"), av.user(), "ACCEPTED");
        assertEventStatus(event, "NEEDS_COORDINATOR");
        JsonNode readiness = call(GET, "/events/" + event + "/readiness", coordinator, null, 200);
        assertThat(readiness.path("totalRequiredVendors").asInt()).isEqualTo(2);
        assertThat(readiness.path("confirmedVendors").asInt()).isEqualTo(1);
        assertThat(readiness.path("readinessPercentage").asInt()).isEqualTo(55);

        VendorActor security = vendor("New Security", "security", 4.0, date.plusYears(1));
        call(POST, "/assignments/event/" + event + "/manual", coordinator,
                Map.of("vendorId", security.vendor().getId(), "category", "security", "reason", "Reviewed newly available security vendor"), 200);
        assertEventStatus(event, "AWAITING_VENDORS");
        respond(currentOffer(event, "security"), security.user(), "ACCEPTED");
        assertEventStatus(event, "CONFIRMED");
    }

    @Test
    void simultaneousConversionsForTheSameVenueHaveOneWinnerAndNoOrphanedRecords() throws Exception {
        vendor("AV", "av", 4.0, date.plusYears(1));
        vendor("Security", "security", 4.0, date.plusYears(1));
        long first = acceptedInquiry(), second = acceptedInquiry();
        long eventCount = events.count(), taskCount = tasks.count(), offerCount = assignments.count();
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        try {
            List<Future<MvcResult>> attempts = List.of(first, second).stream().map(inquiry -> executor.submit(() -> {
                start.await();
                return http.perform(MockMvcRequestBuilders.post("/api/v1/inquiries/{id}/convert", inquiry)
                        .header("Authorization", "Bearer " + jwt.generateJwtToken(coordinator.getUsername(), coordinator.getRole().name()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("name", "Concurrent event " + inquiry,
                                "venue", venue.getName(), "venueId", venue.getId())))).andReturn();
            })).toList();
            start.countDown();
            MvcResult firstResult = attempts.get(0).get(20, TimeUnit.SECONDS);
            MvcResult secondResult = attempts.get(1).get(20, TimeUnit.SECONDS);
            assertThat(List.of(firstResult.getResponse().getStatus(), secondResult.getResponse().getStatus()))
                    .containsExactlyInAnyOrder(200, 400);
            MvcResult failed = firstResult.getResponse().getStatus() == 400 ? firstResult : secondResult;
            assertThat(json.readTree(failed.getResponse().getContentAsByteArray()).path("code").asText()).isEqualTo("VENUE_CONFLICT");
            assertThat(events.count()).isEqualTo(eventCount + 1);
            assertThat(tasks.count()).isEqualTo(taskCount + 5);
            assertThat(assignments.count()).isEqualTo(offerCount + 2);
            assertThat(List.of(events.findByInquiryId(first).isPresent(), events.findByInquiryId(second).isPresent()))
                    .containsExactlyInAnyOrder(true, false);
            assertThat(bookings.findByVenueId(venue.getId())).hasSize(4)
                    .allSatisfy(booking -> assertThat(booking.getStatus()).isEqualTo(VenueBooking.BookingStatus.CONFIRMED));
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void requestChangesKeepsProposalEditableButFinalRejectionLocksConversion() throws Exception {
        long inquiry = proposedInquiry();
        http.perform(MockMvcRequestBuilders.patch("/api/v1/inquiries/{id}/reject", inquiry)
                        .param("reason", "Please revise the price")
                        .header("Authorization", "Bearer " + jwt.generateJwtToken(client.getUsername(), client.getRole().name())))
                .andExpect(status().isOk());
        JsonNode feedback = call(GET, "/inquiries/" + inquiry, client, null, 200);
        assertThat(feedback.path("status").asText()).isEqualTo("PROPOSAL_SENT");
        assertThat(feedback.path("requirements").asText()).contains("Please revise the price");
        call(PUT, "/inquiries/" + inquiry + "/proposal", coordinator, proposal(), 200);
        call(PATCH, "/inquiries/" + inquiry + "/reject", client, null, 200);
        call(PUT, "/inquiries/" + inquiry + "/proposal", coordinator, proposal(), 400);
        call(PATCH, "/inquiries/" + inquiry + "/accept", client, null, 400);
        assertThat(convert(inquiry, 400).path("code").asText()).isEqualTo("INVALID_STATE");
        assertThat(events.findByInquiryId(inquiry)).isEmpty();
        assertThat(call(GET, "/inquiries/" + inquiry, client, null, 200).path("status").asText()).isEqualTo("PROPOSAL_REJECTED");
    }

    private long proposedInquiry() throws Exception {
        long inquiry = call(POST, "/inquiries", client, Map.of("clientId", client.getId(), "clientName", client.getFullName(),
                "eventType", "conference", "eventDate", date.toString(), "endDate", date.plusDays(1).toString(),
                "expectedAttendees", 150, "requirements", "AV equipment, security and in-house catering",
                "requestedCategories", List.of("av", "security", "catering")), 201).path("id").asLong();
        long count = assignments.count();
        call(GET, "/inquiries/" + inquiry + "/recommended-vendors", coordinator, null, 200);
        call(POST, "/inquiries/" + inquiry + "/proposal", coordinator, proposal(), 200);
        assertThat(assignments.count()).isEqualTo(count); // Planning creates no commitments.
        assertThat(call(GET, "/inquiries/" + inquiry, client, null, 200).path("proposal").path("venue").asText()).isEqualTo(venue.getName());
        return inquiry;
    }

    private long acceptedInquiry() throws Exception {
        long inquiry = proposedInquiry();
        call(PATCH, "/inquiries/" + inquiry + "/accept", client, Map.of("categories", List.of("av", "security", "catering")), 200);
        return inquiry;
    }

    private Map<String, Object> proposal() {
        return Map.of("venue", venue.getName(), "venueId", venue.getId(), "price", 120000,
                "terms", "Suggested arrangements; vendor offers follow acceptance",
                "categories", List.of("av", "security", "catering"));
    }

    private JsonNode convert(long inquiry, int expectedStatus) throws Exception {
        return call(POST, "/inquiries/" + inquiry + "/convert", coordinator,
                Map.of("name", "Lifecycle event " + run, "venueId", venue.getId(), "venue", venue.getName()), expectedStatus);
    }

    private void respond(JsonNode offer, User actor, String response) throws Exception {
        call(PATCH, "/assignments/" + offer.path("id").asLong() + "/respond", actor,
                Map.of("response", response, "declineReason", "Unavailable crew"), 200);
    }

    private JsonNode offers(long event) throws Exception { return call(GET, "/assignments/event/" + event, coordinator, null, 200); }
    private JsonNode checklist(long event) throws Exception { return call(GET, "/checklists/event/" + event, coordinator, null, 200); }
    private JsonNode currentOffer(long event, String category) throws Exception {
        return nodes(offers(event)).stream().filter(item -> item.path("serviceCategory").asText().equals(category))
                .max(Comparator.comparingLong(item -> item.path("id").asLong())).orElseThrow();
    }
    private JsonNode byCategory(JsonNode rows, String category) { return nodes(rows).stream().filter(item -> item.path("category").asText().equals(category)).findFirst().orElseThrow(); }
    private JsonNode task(JsonNode rows, long id) { return nodes(rows).stream().filter(item -> item.path("id").asLong() == id).findFirst().orElseThrow(); }
    private List<JsonNode> nodes(JsonNode array) { return StreamSupport.stream(array.spliterator(), false).toList(); }
    private void assertEventStatus(long event, String expected) throws Exception { assertThat(call(GET, "/events/" + event, coordinator, null, 200).path("status").asText()).isEqualTo(expected); }

    private JsonNode call(HttpMethod method, String path, User actor, Object body, int expectedStatus) throws Exception {
        var request = MockMvcRequestBuilders.request(method, "/api/v1" + path)
                .header("Authorization", "Bearer " + jwt.generateJwtToken(actor.getUsername(), actor.getRole().name()));
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body));
        var result = http.perform(request).andExpect(status().is(expectedStatus)).andReturn();
        return json.readTree(result.getResponse().getContentAsByteArray());
    }

    private User user(String name, Role role) {
        return users.save(User.builder().username(name + "-" + run + "-" + UUID.randomUUID().toString().substring(0, 4))
                .fullName(name + " " + run).email(name + "-" + run + "@example.test")
                .passwordHash("not-used-jwt-test").role(role).isActive(true).build());
    }

    private VendorActor vendor(String name, String category, double rating, LocalDate insuranceExpiry) {
        User actor = user(name.replace(" ", "-"), Role.VENDOR);
        Vendor vendor = vendors.save(Vendor.builder().userId(actor.getId()).companyName(name + " " + run)
                .serviceCategory(category).rating(rating).email(actor.getEmail()).isActive(true)
                .insuranceExpiryDate(insuranceExpiry).build());
        return new VendorActor(vendor, actor);
    }

    private record VendorActor(Vendor vendor, User user) { }
}
