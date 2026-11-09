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
    @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Test
    void onlyAdminCanProvisionCoordinatorAccounts() throws Exception {
        User admin = user("admin", Role.ADMIN);
        String path = "/admin/coordinators";
        String username = "staff-" + run;
        String password = "Fixture-only-password";
        var payload = Map.of("fullName", "Demo Coordinator", "username", username,
                "email", username + "@example.test", "password", password);
        call(GET, path, coordinator, null, 403);
        call(POST, path, coordinator, payload, 403);
        JsonNode created = call(POST, path, admin, payload, 201);
        assertThat(created.path("username").asText()).isEqualTo(username);
        assertThat(created.has("passwordHash")).isFalse();
        assertThat(created.has("password")).isFalse();
        User account = users.findByUsername(username).orElseThrow();
        assertThat(account.getRole()).isEqualTo(Role.COORDINATOR);
        assertThat(passwordEncoder.matches(password, account.getPasswordHash())).isTrue();
        assertThat(nodes(call(GET, path, admin, null, 200)))
                .anySatisfy(item -> assertThat(item.path("username").asText()).isEqualTo(username));
        call(POST, path, admin, payload, 409);
    }
    @Autowired private com.aicc.eventmanagement.services.InquiryService inquiryService;
    @Autowired private ObjectMapper json;
    @org.springframework.boot.test.mock.mockito.SpyBean
    private com.aicc.eventmanagement.services.EmailService workflowEmail;
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
        JsonNode acceptedTimeline = call(GET, "/inquiries/" + inquiry + "/timeline", client, null, 200);
        assertThat(acceptedTimeline.path("proposalSent").asBoolean()).isTrue();
        assertThat(acceptedTimeline.path("venueHeld").asBoolean()).isFalse();
        assertThat(acceptedTimeline.path("eventConfirmed").asBoolean()).isFalse();

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
        JsonNode bookedTimeline = call(GET, "/inquiries/" + inquiry + "/timeline", client, null, 200);
        assertThat(bookedTimeline.path("venueHeld").asBoolean()).isTrue();
        assertThat(bookedTimeline.path("venueName").asText()).isEqualTo(venue.getName());
        assertThat(bookedTimeline.path("eventConfirmed").asBoolean()).isFalse();
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
        long inquiry = acceptedInquiry();
        long event = convert(inquiry, 200).path("id").asLong();
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
        JsonNode cancelledTimeline = call(GET, "/inquiries/" + inquiry + "/timeline", client, null, 200);
        assertThat(cancelledTimeline.path("venueHeld").asBoolean()).isFalse();
        assertThat(cancelledTimeline.path("vendorsConfirmed").asBoolean()).isFalse();
        assertThat(cancelledTimeline.path("eventConfirmed").asBoolean()).isFalse();
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
        JsonNode ownerAfterRollback = call(GET, "/inquiries/" + second + "/coordinator", coordinator, null, 200);
        assertThat(ownerAfterRollback.path("coordinator").path("id").asLong()).isEqualTo(coordinator.getId());
        assertThat(nodes(ownerAfterRollback.path("history"))).hasSize(1);
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
        var receipts = Map.of(first, signAndUpload(first), second, signAndUpload(second));
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        try {
            List<Future<MvcResult>> attempts = List.of(first, second).stream().map(inquiry -> executor.submit(() -> {
                start.await();
                return http.perform(MockMvcRequestBuilders.post("/api/v1/inquiries/{id}/booking-agreement/receipt/verify", inquiry)
                        .header("Authorization", "Bearer " + jwt.generateJwtToken(coordinator.getUsername(), coordinator.getRole().name()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("receiptUploadedAt", receipts.get(inquiry))))).andReturn();
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
        call(POST, "/inquiries/" + inquiry + "/convert", coordinator, Map.of("name", "Rejected event"), 400);
        assertThat(events.findByInquiryId(inquiry)).isEmpty();
        assertThat(call(GET, "/inquiries/" + inquiry, client, null, 200).path("status").asText()).isEqualTo("PROPOSAL_REJECTED");
    }

    @Test
    void emptySelectionsStayEmptyUntilTheClientSelectsServices() throws Exception {
        vendor("Fallback AV", "av", 4.0, date.plusYears(1));
        JsonNode inquiry = call(POST, "/inquiries", client, Map.of(
                "clientId", client.getId(), "clientName", client.getFullName(), "eventType", "conference",
                "eventDate", date.toString(), "expectedAttendees", 150, "requestedCategories", List.of()), 201);
        assertThat(inquiry.path("requestedCategories").isArray()).isTrue();
        assertThat(nodes(inquiry.path("requestedCategories"))).isEmpty();

        String path = "/inquiries/" + inquiry.path("id").asLong();
        var proposalWithEmptySelection = new java.util.HashMap<>(proposal());
        proposalWithEmptySelection.put("categories", List.of());
        JsonNode sent = call(POST, path + "/proposal", coordinator, proposalWithEmptySelection, 200);
        assertThat(sent.path("proposal").path("categories")).isEqualTo(inquiry.path("requestedCategories"));

        call(PATCH, path + "/accept", client, Map.of("categories", List.of("av")), 200);
        JsonNode converted = convert(inquiry.path("id").asLong(), 200);
        assertThat(nodes(offers(converted.path("id").asLong())).stream()
                .map(offer -> offer.path("serviceCategory").asText())).containsExactly("av");
    }

    @Test
    void vendorIssuesRequireCoordinatorVerificationAndKeepProgressHistory() throws Exception {
        VendorActor supplier = vendor("Issue AV", "av", 4.0, date.plusYears(1));
        VendorActor otherSupplier = vendor("Issue Security", "security", 4.0, date.plusYears(1));
        long event = convert(acceptedInquiry(), 200).path("id").asLong();
        JsonNode offer = currentOffer(event, "av");
        respond(offer, supplier.user(), "ACCEPTED");
        String path = "/events/" + event + "/issues";
        var report = Map.of("title", "Replacement projector needed", "description", "The projector is unavailable",
                "priority", "HIGH", "assignmentId", offer.path("id").asLong());
        call(POST, path, client, report, 403);
        User outsider = user("other-issue-vendor", Role.VENDOR);
        call(POST, path, outsider, report, 403);
        JsonNode issue = call(POST, path, supplier.user(), report, 201);
        String issuePath = "/issues/" + issue.path("id").asLong();
        assertThat(issue.path("status").asText()).isEqualTo("OPEN");
        assertThat(issue.path("responsible").path("role").asText()).isEqualTo("COORDINATOR");
        assertThat(nodes(call(GET, path, supplier.user(), null, 200))).hasSize(1);
        assertThat(nodes(call(GET, path, otherSupplier.user(), null, 200))).isEmpty();
        call(POST, issuePath + "/updates", otherSupplier.user(), Map.of("note", "Another supplier's update"), 403);
        call(POST, issuePath + "/updates", outsider, Map.of("note", "Unrelated update"), 403);

        var edit = new java.util.HashMap<String, Object>();
        edit.put("version", issue.path("version").asLong());
        edit.put("priority", "URGENT");
        edit.put("responsibleUserId", supplier.user().getId());
        edit.put("dueDate", LocalDate.now().minusDays(1).toString());
        edit.put("status", "RESOLVED");
        edit.put("resolutionNote", "Replacement verified");
        call(PUT, issuePath, supplier.user(), edit, 403);
        call(PUT, issuePath, coordinator, edit, 400);
        edit.put("status", "IN_PROGRESS");
        JsonNode assigned = call(PUT, issuePath, coordinator, edit, 200);
        assertThat(assigned.path("overdue").asBoolean()).isTrue();
        assertThat(assigned.path("responsible").path("id").asLong()).isEqualTo(supplier.user().getId());
        assertThat(nodes(call(GET, "/issues", coordinator, null, 200)))
                .anySatisfy(item -> assertThat(item.path("id").asLong()).isEqualTo(issue.path("id").asLong()));
        call(PUT, issuePath, coordinator, edit, 400); // A stale form cannot overwrite a coordinator decision.
        call(POST, issuePath + "/updates", supplier.user(), Map.of("note", "Replacement delivered"), 200);
        edit.put("version", assigned.path("version").asLong());
        edit.put("status", "RESOLVED");
        edit.put("resolutionNote", " ");
        call(PUT, issuePath, coordinator, edit, 400);
        edit.put("resolutionNote", "Replacement tested and verified");
        JsonNode resolved = call(PUT, issuePath, coordinator, edit, 200);
        assertThat(resolved.path("resolvedBy").path("id").asLong()).isEqualTo(coordinator.getId());
        assertThat(resolved.path("overdue").asBoolean()).isFalse();
        JsonNode persisted = nodes(call(GET, path, supplier.user(), null, 200)).get(0);
        assertThat(persisted.path("resolutionNote").asText()).isEqualTo("Replacement tested and verified");
        assertThat(nodes(persisted.path("updates"))).hasSize(4);
        call(POST, issuePath + "/updates", supplier.user(), Map.of("note", "Late edit"), 400);
        assertThat(nodes(call(GET, "/issues", coordinator, null, 200)))
                .noneSatisfy(item -> assertThat(item.path("id").asLong()).isEqualTo(issue.path("id").asLong()));
    }

    @Test
    void issueLinksCannotPointToAnotherEventAndTaskRemovalPreservesTheIssue() throws Exception {
        User admin = user("issue-admin", Role.ADMIN);
        vendor("Linked AV", "av", 4.0, date.plusYears(1));
        long firstEvent = convert(acceptedInquiry(), 200).path("id").asLong();
        vendor("Other event AV", "av", 4.0, date.plusYears(1));
        venue = venues.save(Venue.builder().name("Second issue hall " + run).capacity(300).active(true).build());
        long secondEvent = convert(acceptedInquiry(), 200).path("id").asLong();
        long otherAssignment = currentOffer(secondEvent, "av").path("id").asLong();
        long otherTask = nodes(checklist(secondEvent)).get(0).path("id").asLong();
        String path = "/events/" + firstEvent + "/issues";
        var report = new java.util.HashMap<String, Object>();
        report.put("title", "Preparation problem");
        report.put("description", "Task needs coordinator review");
        report.put("priority", "MEDIUM");
        report.put("assignmentId", otherAssignment);
        call(POST, path, coordinator, report, 400);
        report.remove("assignmentId");
        report.put("checklistId", otherTask);
        call(POST, path, coordinator, report, 400);
        JsonNode manualTask = call(POST, "/checklists", coordinator,
                Map.of("eventId", firstEvent, "itemName", "Temporary issue task", "ownerRole", "COORDINATOR"), 201);
        report.put("checklistId", manualTask.path("id").asLong());
        JsonNode issue = call(POST, path, coordinator, report, 201);
        http.perform(MockMvcRequestBuilders.delete("/api/v1/checklists/{id}", manualTask.path("id").asLong())
                        .header("Authorization", "Bearer " + jwt.generateJwtToken(admin.getUsername(), admin.getRole().name())))
                .andExpect(status().isNoContent());
        JsonNode persisted = nodes(call(GET, path, coordinator, null, 200)).get(0);
        assertThat(persisted.path("id").asLong()).isEqualTo(issue.path("id").asLong());
        assertThat(persisted.path("checklistId").isNull()).isTrue();
        call(PATCH, "/events/" + firstEvent + "/status?status=CANCELLED", coordinator, null, 200);
        call(POST, path, coordinator, report, 400);
    }

    @Test
    void coordinatorOwnershipFollowsConversionAndRoutesIssuesThroughAnAuditedHandover() throws Exception {
        User admin = user("ownership-admin", Role.ADMIN);
        User replacement = user("replacement-coordinator", Role.COORDINATOR);
        VendorActor supplier = vendor("Ownership AV", "av", 4.0, date.plusYears(1));
        long inquiry = submittedInquiry();
        String ownerPath = "/inquiries/" + inquiry + "/coordinator";
        call(POST, ownerPath + "/claim", client, null, 403);
        call(POST, ownerPath + "/claim", admin, null, 403);
        call(POST, ownerPath + "/claim", supplier.user(), null, 403);
        JsonNode claimed = call(POST, ownerPath + "/claim", coordinator, null, 200);
        assertThat(claimed.path("coordinator").path("id").asLong()).isEqualTo(coordinator.getId());
        call(POST, ownerPath + "/claim", replacement, null, 409);
        assertThat(nodes(call(POST, ownerPath + "/claim", coordinator, null, 200).path("history"))).hasSize(1);

        var handover = new java.util.HashMap<String, Object>();
        handover.put("coordinatorId", replacement.getId());
        handover.put("expectedVersion", claimed.path("version").asLong());
        handover.put("reason", "Balance the preparation workload");
        call(PUT, ownerPath, coordinator, handover, 403);
        handover.put("coordinatorId", client.getId());
        call(PUT, ownerPath, admin, handover, 400);
        replacement.setActive(false);
        users.saveAndFlush(replacement);
        handover.put("coordinatorId", replacement.getId());
        call(PUT, ownerPath, admin, handover, 400);
        replacement.setActive(true);
        users.saveAndFlush(replacement);
        JsonNode reassigned = call(PUT, ownerPath, admin, handover, 200);
        call(PUT, ownerPath, admin, handover, 409);
        call(POST, "/inquiries/" + inquiry + "/proposal", coordinator, proposal(), 200);
        call(PATCH, "/inquiries/" + inquiry + "/accept", client, null, 200);
        String receipt = signAndUpload(inquiry, replacement);
        long event = call(POST, agreementPath(inquiry) + "/receipt/verify", replacement,
                Map.of("receiptUploadedAt", receipt), 200).path("id").asLong();
        assertThat(call(GET, "/events/" + event, client, null, 200).path("coordinator").path("id").asLong())
                .isEqualTo(replacement.getId());
        assertThat(call(GET, "/inquiries/" + inquiry, client, null, 200).path("coordinator").path("id").asLong())
                .isEqualTo(replacement.getId());
        JsonNode offer = currentOffer(event, "av");
        respond(offer, supplier.user(), "ACCEPTED");
        JsonNode issue = call(POST, "/events/" + event + "/issues", supplier.user(),
                Map.of("title", "Projector problem", "description", "Need a replacement", "priority", "HIGH",
                        "assignmentId", offer.path("id").asLong()), 201);
        assertThat(issue.path("responsible").path("id").asLong()).isEqualTo(replacement.getId());
        handover.put("coordinatorId", coordinator.getId());
        handover.put("expectedVersion", reassigned.path("version").asLong());
        handover.put("reason", "Lead coordinator returned");
        JsonNode finalOwner = call(PUT, ownerPath, admin, handover, 200);
        assertThat(nodes(finalOwner.path("history"))).hasSize(3);
        assertThat(finalOwner.path("history").get(0).path("changedById").asLong()).isEqualTo(admin.getId());
        JsonNode transferred = nodes(call(GET, "/events/" + event + "/issues", coordinator, null, 200)).get(0);
        assertThat(transferred.path("responsible").path("id").asLong()).isEqualTo(coordinator.getId());
        assertThat(transferred.path("updates").get(1).path("note").asText()).contains("Coordinator handover");
        JsonNode workload = nodes(call(GET, "/coordinators/workload", coordinator, null, 200)).stream()
                .filter(item -> item.path("coordinator").path("id").asLong() == coordinator.getId()).findFirst().orElseThrow();
        assertThat(workload.path("events").asLong()).isEqualTo(1);
        assertThat(workload.path("inquiries").asLong()).isZero();
        call(GET, ownerPath, client, null, 403);
        assertThat(call(GET, "/events/" + event, client, null, 200).path("coordinator").has("passwordHash")).isFalse();
    }

    @Test
    void competingCoordinatorClaimsHaveOneOwnerAndOneHistoryEntry() throws Exception {
        long inquiry = submittedInquiry();
        User competitor = user("competing-coordinator", Role.COORDINATOR);
        var executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            java.util.List<Future<Integer>> responses = new java.util.ArrayList<>();
            for (User actor : List.of(coordinator, competitor)) {
                responses.add(executor.submit(() -> {
                    start.await(10, TimeUnit.SECONDS);
                    return http.perform(MockMvcRequestBuilders.post("/api/v1/inquiries/{id}/coordinator/claim", inquiry)
                                    .header("Authorization", "Bearer " + jwt.generateJwtToken(actor.getUsername(), actor.getRole().name())))
                            .andReturn().getResponse().getStatus();
                }));
            }
            start.countDown();
            assertThat(List.of(responses.get(0).get(20, TimeUnit.SECONDS), responses.get(1).get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
            JsonNode ownership = call(GET, "/inquiries/" + inquiry + "/coordinator", coordinator, null, 200);
            assertThat(nodes(ownership.path("history"))).hasSize(1);
            assertThat(ownership.path("version").asLong()).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void legacyUnassignedEventsCanReceiveALeadWithoutMovingVendorWorkOrResolvedIssues() throws Exception {
        User admin = user("legacy-owner-admin", Role.ADMIN);
        User lead = user("legacy-event-lead", Role.COORDINATOR);
        VendorActor supplier = vendor("Legacy AV", "av", 4.0, date.plusYears(1));
        long inquiry = acceptedInquiry();
        jdbc.update("DELETE FROM coordinator_assignment_history WHERE inquiry_id = ?", inquiry);
        jdbc.update("UPDATE inquiries SET coordinator_id = NULL, coordinator_version = 0 WHERE id = ?", inquiry);
        // Create a historical fixture that predates contract and receipt verification.
        var legacyRequest = new com.aicc.eventmanagement.payload.ConvertToEventRequest();
        legacyRequest.setName("Legacy unassigned event");
        long event = inquiryService.convertToEvent(inquiry, legacyRequest).getId();
        JsonNode offer = currentOffer(event, "av");
        respond(offer, supplier.user(), "ACCEPTED");
        String issuePath = "/events/" + event + "/issues";
        var report = new java.util.HashMap<String, Object>();
        report.put("title", "Legacy preparation problem");
        report.put("description", "Requires coordinator review");
        report.put("priority", "MEDIUM");
        report.put("assignmentId", offer.path("id").asLong());
        assertThat(call(POST, issuePath, supplier.user(), report, 400).path("code").asText()).isEqualTo("NO_COORDINATOR");
        long coordinatorIssue = call(POST, issuePath, coordinator, report, 201).path("id").asLong();
        report.put("responsibleUserId", supplier.user().getId());
        long vendorIssue = call(POST, issuePath, coordinator, report, 201).path("id").asLong();
        report.remove("responsibleUserId");
        JsonNode resolvedIssue = call(POST, issuePath, coordinator, report, 201);
        var edit = new java.util.HashMap<String, Object>();
        edit.put("version", resolvedIssue.path("version").asLong());
        edit.put("priority", "MEDIUM");
        edit.put("responsibleUserId", coordinator.getId());
        edit.put("status", "IN_PROGRESS");
        resolvedIssue = call(PUT, "/issues/" + resolvedIssue.path("id").asLong(), coordinator, edit, 200);
        edit.put("version", resolvedIssue.path("version").asLong());
        edit.put("status", "RESOLVED");
        edit.put("resolutionNote", "Verified before the handover");
        resolvedIssue = call(PUT, "/issues/" + resolvedIssue.path("id").asLong(), coordinator, edit, 200);
        String ownerPath = "/inquiries/" + inquiry + "/coordinator";
        call(PUT, ownerPath, admin, Map.of("coordinatorId", lead.getId(), "expectedVersion", 0,
                "reason", "Assign a lead to existing work"), 200);
        for (JsonNode issue : nodes(call(GET, issuePath, coordinator, null, 200))) {
            long expected = issue.path("id").asLong() == coordinatorIssue ? lead.getId()
                    : issue.path("id").asLong() == vendorIssue ? supplier.user().getId() : coordinator.getId();
            assertThat(issue.path("responsible").path("id").asLong()).isEqualTo(expected);
        }
        assertThat(call(POST, issuePath, supplier.user(), report, 201).path("responsible").path("id").asLong())
                .isEqualTo(lead.getId());
        call(PATCH, "/events/" + event + "/status?status=CANCELLED", coordinator, null, 200);
        call(PUT, ownerPath, admin, Map.of("coordinatorId", coordinator.getId(), "expectedVersion", 1,
                "reason", "Attempt to move closed work"), 400);
    }

    @Test
    void firstProposalPicksUpUnclaimedInquiryAndConversionKeepsThatHandler() throws Exception {
        long inquiry = submittedInquiry();
        String path = "/inquiries/" + inquiry;
        User converter = user("converting-coordinator", Role.COORDINATOR);
        call(GET, path, converter, null, 200);
        assertThat(call(GET, path + "/coordinator", coordinator, null, 200).path("coordinator").isNull()).isTrue();
        JsonNode sent = call(POST, path + "/proposal", coordinator, proposal(), 200);
        assertThat(sent.path("coordinator").path("id").asLong()).isEqualTo(coordinator.getId());
        call(PATCH, path + "/accept", client, null, 200);
        call(GET, path + "/booking-agreement", converter, null, 403);
        JsonNode event = convert(inquiry, 200);
        assertThat(event.path("coordinator").path("id").asLong()).isEqualTo(coordinator.getId());
        assertThat(nodes(call(GET, path + "/coordinator", coordinator, null, 200).path("history"))).hasSize(1);
    }

    @Test
    void clientCalendarShowsCapacityBlackoutsAndBookingBuffersWithoutBookingDetails() throws Exception {
        venue.setCapacity(900);
        venues.saveAndFlush(venue);
        User admin = user("calendar-admin", Role.ADMIN);
        call(POST, "/venues/" + venue.getId() + "/unavailable-dates", admin,
                Map.of("date", date.minusDays(5).toString(), "reason", "Private maintenance note"), 201);
        convert(acceptedInquiry(), 200);

        String calendar = "/venues/availability/calendar?start=" + date.minusDays(4)
                + "&end=" + date.minusDays(2);
        List<JsonNode> days = nodes(call(GET, calendar + "&attendees=850", client, null, 200));
        assertThat(days).hasSize(3);
        assertThat(days.stream().map(day -> day.path("available").asBoolean()))
                .containsExactly(false, true, false);
        assertThat(days).allSatisfy(day -> {
            assertThat(day.size()).isEqualTo(2);
            assertThat(day.hasNonNull("date")).isTrue();
        });
        assertThat(nodes(call(GET, calendar + "&attendees=901", client, null, 200)))
                .allSatisfy(day -> assertThat(day.path("available").asBoolean()).isFalse());
        for (var expected : Map.of(date.minusDays(4), "administrator-blocked",
                date.minusDays(2), "confirmed venue booking").entrySet()) {
            JsonNode fit = nodes(call(GET, "/venues/availability/reasons?date=" + expected.getKey()
                    + "&attendees=901", client, null, 200)).stream()
                    .filter(row -> row.path("venueId").asLong() == venue.getId()).findFirst().orElseThrow();
            assertThat(fit.path("available").asBoolean()).isFalse();
            assertThat(fit.path("reasons").toString()).contains("Capacity 900 is below 901", expected.getValue())
                    .doesNotContain("Private maintenance note");
        }
        call(GET, "/venues/availability/calendar?start=" + date + "&end=" + date.plusDays(31), client, null, 400);
    }

    private long submittedInquiry() throws Exception {
        return call(POST, "/inquiries", client, Map.of("clientId", client.getId(), "clientName", client.getFullName(),
                "eventType", "conference", "eventDate", date.toString(), "endDate", date.plusDays(1).toString(),
                "expectedAttendees", 150, "requirements", "AV equipment, security and in-house catering",
                "requestedCategories", List.of("av", "security", "catering")), 201).path("id").asLong();
    }

    private long proposedInquiry() throws Exception {
        long inquiry = submittedInquiry();
        JsonNode submittedTimeline = call(GET, "/inquiries/" + inquiry + "/timeline", client, null, 200);
        assertThat(submittedTimeline.path("proposalSent").asBoolean()).isFalse();
        assertThat(submittedTimeline.path("venueHeld").asBoolean()).isFalse();
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
        String receipt = signAndUpload(inquiry);
        return call(POST, agreementPath(inquiry) + "/receipt/verify", coordinator,
                Map.of("receiptUploadedAt", receipt), expectedStatus);
    }

    private String agreementPath(long inquiry) { return "/inquiries/" + inquiry + "/booking-agreement"; }

    private String signAndUpload(long inquiry) throws Exception {
        return signAndUpload(inquiry, coordinator);
    }

    private String signAndUpload(long inquiry, User assignedCoordinator) throws Exception {
        String path = agreementPath(inquiry);
        String revision = call(GET, path, client, null, 200).path("revision").asText();
        call(POST, path + "/signature", client, Map.of("name", client.getFullName(), "revision", revision, "consent", true), 200);
        call(POST, path + "/signature", assignedCoordinator,
                Map.of("name", assignedCoordinator.getFullName(), "revision", revision, "consent", true), 200);
        return uploadReceipt(inquiry, 200).path("receiptUploadedAt").asText();
    }

    private JsonNode uploadReceipt(long inquiry, int expected) throws Exception {
        var file = new org.springframework.mock.web.MockMultipartFile("receipt", "receipt.pdf", "application/pdf",
                "%PDF-1.4 test fixture".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        var result = http.perform(MockMvcRequestBuilders.multipart("/api/v1" + agreementPath(inquiry) + "/receipt")
                .file(file).header("Authorization", "Bearer " + jwt.generateJwtToken(client.getUsername(), "CLIENT")))
                .andExpect(status().is(expected)).andReturn();
        return json.readTree(result.getResponse().getContentAsByteArray());
    }

    @Test
    void workflowNotifiesTheRightAccountsAndPersistsReadState() throws Exception {
        VendorActor av = vendor("Notification AV", "av", 4.0, date.plusYears(1));
        VendorActor security = vendor("Notification Security", "security", 4.0, date.plusYears(1));
        long inquiry = acceptedInquiry();
        String inquiryLink = "/client/inquiries/" + inquiry;
        JsonNode clientInbox = call(GET, "/notifications", client, null, 200);
        assertThat(clientInbox.path("unreadCount").asLong()).isEqualTo(1);
        JsonNode proposal = clientInbox.path("items").get(0);
        assertThat(proposal.path("path").asText()).isEqualTo(inquiryLink);
        assertThat(proposal.path("title").asText()).isEqualTo("Your event proposal is ready");
        org.mockito.Mockito.verify(workflowEmail, org.mockito.Mockito.timeout(5000).times(1))
                .sendWorkflowNotification(org.mockito.ArgumentMatchers.argThat(notice ->
                        notice.recipient().equals(client.getEmail()) && notice.path().equals(inquiryLink)
                        && notice.title().equals("Your event proposal is ready")));

        String markRead = "/notifications/" + proposal.path("id").asLong() + "/read";
        call(PATCH, markRead, coordinator, null, 404);
        call(PATCH, markRead, client, null, 204);
        assertThat(call(GET, "/notifications", client, null, 200).path("unreadCount").asLong()).isZero();

        String receipt = signAndUpload(inquiry);
        assertThat(nodes(call(GET, "/notifications", coordinator, null, 200).path("items")))
                .anyMatch(item -> item.path("title").asText().equals("Payment receipt ready to review"));
        long event = call(POST, agreementPath(inquiry) + "/receipt/verify", coordinator,
                Map.of("receiptUploadedAt", receipt), 200).path("id").asLong();
        JsonNode offer = currentOffer(event, "av");
        assertThat(nodes(call(GET, "/notifications", av.user(), null, 200).path("items")))
                .anyMatch(item -> item.path("path").asText().equals("/vendor/assignments/" + offer.path("id").asLong()));
        respond(offer, av.user(), "ACCEPTED");
        respond(currentOffer(event, "security"), security.user(), "ACCEPTED");
        assertThat(nodes(call(GET, "/notifications", client, null, 200).path("items")))
                .anyMatch(item -> item.path("title").asText().equals("Your event is confirmed")
                        && item.path("path").asText().equals("/client/events/" + event));
        call(PATCH, "/notifications/read-all", client, null, 204);
        assertThat(call(GET, "/notifications", client, null, 200).path("unreadCount").asLong()).isZero();
    }

    @Test
    void onlyTheAssignedCoordinatorCanBookAfterBothSignAndPaymentIsReviewed() throws Exception {
        long inquiry = acceptedInquiry();
        String path = agreementPath(inquiry);
        User outsider = user("other-coordinator", Role.COORDINATOR);
        User admin = user("booking-admin", Role.ADMIN);
        String report = "/admin/dashboard/revenue?months=3";
        String lifecycle = "/admin/dashboard/lifecycle";
        call(GET, lifecycle, coordinator, null, 403);
        JsonNode stagesBefore = call(GET, lifecycle, admin, null, 200);
        assertThat(stagesBefore.path("inquiries").path("PROPOSAL_ACCEPTED").asLong()).isPositive();
        call(GET, report, coordinator, null, 403);
        JsonNode before = call(GET, report, admin, null, 200);
        assertThat(before.path("monthly").size()).isEqualTo(3);
        assertThat(call(POST, "/inquiries/" + inquiry + "/convert", coordinator, Map.of("name", "Bypass"), 400)
                .path("code").asText()).isEqualTo("BOOKING_AGREEMENT_REQUIRED");
        call(PATCH, "/inquiries/" + inquiry + "/status?status=EVENT_CREATED", coordinator, null, 400);
        uploadReceipt(inquiry, 400);
        assertThat(bookings.findByVenueId(venue.getId())).isEmpty();

        JsonNode draft = call(GET, path, client, null, 200);
        assertThat(draft.path("terms").path("totalEtb").asInt()).isEqualTo(120000);
        String revision = draft.path("revision").asText();
        call(POST, path + "/signature", client, Map.of("name", "Client", "revision", "outdated", "consent", true), 400);
        call(POST, path + "/signature", client, Map.of("name", "Client", "revision", revision, "consent", true), 200);
        uploadReceipt(inquiry, 400);
        call(POST, path + "/signature", outsider, Map.of("name", "Other", "revision", revision, "consent", true), 403);
        call(POST, path + "/signature", coordinator, Map.of("name", "Coordinator", "revision", revision, "consent", true), 200);
        JsonNode signed = call(GET, report, admin, null, 200);
        assertThat(signed.path("awaitingReceipt").path("totalEtb").asLong())
                .isEqualTo(before.path("awaitingReceipt").path("totalEtb").asLong() + 120000);
        JsonNode uploaded = uploadReceipt(inquiry, 200);
        JsonNode pending = call(GET, report, admin, null, 200);
        assertThat(pending.path("verified")).isEqualTo(before.path("verified"));
        assertThat(pending.path("awaitingReceipt")).isEqualTo(before.path("awaitingReceipt"));
        assertThat(pending.path("awaitingReview").path("totalEtb").asLong())
                .isEqualTo(before.path("awaitingReview").path("totalEtb").asLong() + 120000);
        var verification = Map.of("receiptUploadedAt", uploaded.path("receiptUploadedAt").asText());
        call(POST, path + "/receipt/verify", outsider, verification, 403);
        call(POST, path + "/receipt/verify", admin, verification, 403);
        assertThat(bookings.findByVenueId(venue.getId())).isEmpty();
        call(POST, path + "/receipt/reject", coordinator, Map.of("reason", "Amount not visible", "receiptUploadedAt", uploaded.path("receiptUploadedAt").asText()), 200);
        call(POST, path + "/receipt/verify", coordinator, verification, 400);
        JsonNode replacement = uploadReceipt(inquiry, 200);
        call(POST, path + "/receipt/verify", coordinator, verification, 400);
        call(POST, path + "/receipt/verify", coordinator,
                Map.of("receiptUploadedAt", replacement.path("receiptUploadedAt").asText()), 200);
        assertThat(bookings.findByVenueId(venue.getId())).hasSize(4);
        assertThat(call(GET, path, client, null, 200).path("state").asText()).isEqualTo("BOOKED");
        JsonNode stagesAfter = call(GET, lifecycle, admin, null, 200);
        assertThat(stagesAfter.path("inquiries").path("PROPOSAL_ACCEPTED").asLong())
                .isEqualTo(stagesBefore.path("inquiries").path("PROPOSAL_ACCEPTED").asLong() - 1);
        assertThat(nodes(stagesAfter.path("events")).stream().mapToLong(JsonNode::asLong).sum())
                .isEqualTo(nodes(stagesBefore.path("events")).stream().mapToLong(JsonNode::asLong).sum() + 1);
        JsonNode after = call(GET, report, admin, null, 200);
        assertThat(after.path("awaitingReview")).isEqualTo(before.path("awaitingReview"));
        assertThat(after.path("verified").path("totalEtb").asLong())
                .isEqualTo(before.path("verified").path("totalEtb").asLong() + 120000);
        assertThat(after.path("monthly").get(2).path("totalEtb").asLong())
                .isEqualTo(before.path("monthly").get(2).path("totalEtb").asLong() + 120000);
        assertThat(nodes(after.path("byVenue"))).anySatisfy(row -> {
            assertThat(row.path("label").asText()).isEqualTo(venue.getName());
            assertThat(row.path("totalEtb").asLong()).isEqualTo(120000);
        });
    }

    @Test
    void exhibitionAndMeetingWindowsAreUsedForTheContractAndEveryBookedDay() throws Exception {
        date = LocalDate.now().plusDays(14);
        User admin = user("outlook-admin", Role.ADMIN);
        String outlookPath = "/admin/dashboard/outlook";
        call(GET, outlookPath, coordinator, null, 403);
        for (String type : List.of("exhibition", "meeting")) {
            int venueBuffer = type.equals("meeting") ? 2 : 0;
            Venue hall = venues.save(Venue.builder().name(type + " hall " + run).capacity(300)
                    .setupBufferDays(venueBuffer).teardownBufferDays(venueBuffer).active(true).build());
            long inquiry = call(POST, "/inquiries", client, Map.of("clientId", client.getId(),
                    "clientName", client.getFullName(), "eventType", type, "eventDate", date.toString(),
                    "expectedAttendees", 100, "requestedCategories", List.of("venue")), 201).path("id").asLong();
            call(POST, "/inquiries/" + inquiry + "/proposal", coordinator, Map.of("venue", hall.getName(),
                    "venueId", hall.getId(), "price", 50000, "terms", "Full window", "categories", List.of("venue")), 200);
            call(PATCH, "/inquiries/" + inquiry + "/accept", client, null, 200);
            JsonNode terms = call(GET, agreementPath(inquiry), client, null, 200).path("terms");
            LocalDate from = type.equals("meeting") ? date.minusDays(1) : date;
            int days = type.equals("meeting") ? 3 : 7;
            assertThat(terms.path("bookedFrom").asText()).isEqualTo(from.toString());
            assertThat(terms.path("bookedThrough").asText()).isEqualTo(from.plusDays(days - 1).toString());
            convert(inquiry, 200);
            assertThat(bookings.findByVenueId(hall.getId())).extracting(VenueBooking::getBookingDate)
                    .containsExactlyInAnyOrderElementsOf(from.datesUntil(from.plusDays(days)).toList());
            JsonNode outlook = call(GET, outlookPath, admin, null, 200);
            assertThat(nodes(outlook.path("venues"))).anySatisfy(row -> {
                assertThat(row.path("id").asLong()).isEqualTo(hall.getId());
                assertThat(row.path("reservedDays").asLong()).isEqualTo(days);
            });
        }
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
