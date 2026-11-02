package com.aicc.eventmanagement.integration;

import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.repositories.ChecklistRepository;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.aicc.eventmanagement.security.JwtUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RecordOwnershipIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtils jwtUtils;
    @Autowired private UserRepository userRepository;
    @Autowired private InquiryRepository inquiryRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private VendorRepository vendorRepository;
    @Autowired private VendorAssignmentRepository assignmentRepository;
    @Autowired private ChecklistRepository checklistRepository;

    private User clientA;
    private User clientB;
    private User vendorUserA;
    private User vendorUserB;
    private User coordinator;
    private Inquiry inquiryA;
    private Inquiry inquiryB;
    private Event eventA;
    private Event eventB;
    private Vendor vendorA;
    private Vendor vendorB;
    private VendorAssignment assignmentA;
    private VendorAssignment assignmentB;
    private Checklist coordinatorTaskB;

    @BeforeEach
    void setUp() {
        clientA = user("client-a", Role.CLIENT);
        clientB = user("client-b", Role.CLIENT);
        vendorUserA = user("vendor-a", Role.VENDOR);
        vendorUserB = user("vendor-b", Role.VENDOR);
        coordinator = user("coordinator", Role.COORDINATOR);

        inquiryA = inquiry(clientA, "Client A event");
        inquiryB = inquiry(clientB, "Client B event");
        eventA = event(inquiryA, "Event A", EventStatus.CONFIRMED);
        eventB = event(inquiryB, "Event B", EventStatus.CONFIRMED);

        vendorA = vendor(vendorUserA, "Vendor A");
        vendorB = vendor(vendorUserB, "Vendor B");
        assignmentA = assignment(eventA, vendorA);
        assignmentB = assignment(eventB, vendorB);

        coordinatorTaskB = checklist(eventB, "Coordinator task", Role.COORDINATOR);
        checklist(eventB, "Vendor task", Role.VENDOR);
    }

    @Test
    void clientCannotReadMutateOrCreateRecordsForAnotherClient() throws Exception {
        String token = token(clientA);

        mockMvc.perform(get("/api/v1/inquiries/{id}", inquiryB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/inquiries/client/{clientId}", clientB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/inquiries/{id}/accept", inquiryB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/inquiries/{id}/status", inquiryB.getId())
                        .param("status", EventStatus.CLOSED.name()).header("Authorization", token))
                .andExpect(status().isForbidden());

        long countBefore = inquiryRepository.count();
        String spoofedCreate = """
                {"clientId":%d,"clientName":"Client B","eventType":"Conference",
                 "eventDate":"%s","expectedAttendees":50,"requirements":"test"}
                """.formatted(clientB.getId(), LocalDate.now().plusDays(30));
        mockMvc.perform(post("/api/v1/inquiries").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(spoofedCreate))
                .andExpect(status().isForbidden());

        assertThat(inquiryRepository.count()).isEqualTo(countBefore);
        assertThat(inquiryRepository.findById(inquiryB.getId()).orElseThrow().getStatus())
                .isEqualTo(EventStatus.PROPOSAL_SENT);

        mockMvc.perform(get("/api/v1/inquiries/{id}", inquiryA.getId()).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientId").value(clientA.getId()));
    }

    @Test
    void clientCannotReadAnotherClientsEventsAssignmentsOrChecklistTasks() throws Exception {
        String token = token(clientA);

        mockMvc.perform(get("/api/v1/events/{id}", eventB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/events/inquiry/{id}", inquiryB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/assignments/event/{id}", eventB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/checklists/event/{id}", eventB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/checklists/{id}", coordinatorTaskB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/checklists/{id}/complete", coordinatorTaskB.getId())
                        .header("Authorization", token))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/events").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(eventA.getId()))
                .andExpect(jsonPath("$[1]").doesNotExist());
        assertThat(checklistRepository.findById(coordinatorTaskB.getId()).orElseThrow().isComplete()).isFalse();
    }

    @Test
    void vendorCanAccessOwnAssignmentButNotAnotherVendorsAssignmentOrEvent() throws Exception {
        String token = token(vendorUserA);

        mockMvc.perform(get("/api/v1/assignments/{id}", assignmentB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/events/{id}", eventB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/assignments/{id}/respond", assignmentB.getId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"response\":\"ACCEPTED\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/assignments/{id}", assignmentA.getId()).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(assignmentA.getId()));
        mockMvc.perform(get("/api/v1/events").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(eventA.getId()))
                .andExpect(jsonPath("$[1]").doesNotExist());
        assertThat(assignmentRepository.findById(assignmentB.getId()).orElseThrow().getStatus())
                .isEqualTo(VendorAssignmentStatus.PENDING);
    }

    @Test
    void coordinatorCancellationReturnsSuccessAfterPersistingTheCascade() throws Exception {
        mockMvc.perform(patch("/api/v1/events/{id}/status", eventB.getId())
                        .param("status", EventStatus.CANCELLED.name())
                        .header("Authorization", token(coordinator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(EventStatus.CANCELLED.name()));

        assertThat(eventRepository.findById(eventB.getId()).orElseThrow().getStatus())
                .isEqualTo(EventStatus.CANCELLED);
        assertThat(assignmentRepository.findById(assignmentB.getId()).orElseThrow().getStatus())
                .isEqualTo(VendorAssignmentStatus.CANCELLED);
    }

    private User user(String username, Role role) {
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.test")
                .passwordHash("not-used")
                .role(role)
                .fullName(username)
                .isActive(true)
                .build());
    }

    private String token(User user) {
        return "Bearer " + jwtUtils.generateJwtToken(user.getUsername(), user.getRole().name());
    }

    private Inquiry inquiry(User client, String name) {
        return inquiryRepository.save(Inquiry.builder()
                .clientId(client.getId())
                .clientName(name)
                .eventType("Conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(50)
                .status(EventStatus.PROPOSAL_SENT)
                .build());
    }

    private Event event(Inquiry inquiry, String name, EventStatus status) {
        return eventRepository.save(Event.builder()
                .inquiry(inquiry)
                .name(name)
                .status(status)
                .venue("Test Hall")
                .requiredCategories("av")
                .build());
    }

    private Vendor vendor(User user, String companyName) {
        return vendorRepository.save(Vendor.builder()
                .userId(user.getId())
                .companyName(companyName)
                .serviceCategory("av")
                .email(companyName.toLowerCase().replace(' ', '-') + "@example.test")
                .isActive(true)
                .build());
    }

    private VendorAssignment assignment(Event event, Vendor vendor) {
        return assignmentRepository.save(VendorAssignment.builder()
                .event(event)
                .vendor(vendor)
                .vendorName(vendor.getCompanyName())
                .serviceCategory("av")
                .status(VendorAssignmentStatus.PENDING)
                .build());
    }

    private Checklist checklist(Event event, String itemName, Role ownerRole) {
        return checklistRepository.save(Checklist.builder()
                .event(event)
                .itemName(itemName)
                .ownerRole(ownerRole)
                .isComplete(false)
                .build());
    }
}
