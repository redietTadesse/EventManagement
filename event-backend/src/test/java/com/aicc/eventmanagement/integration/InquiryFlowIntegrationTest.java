package com.aicc.eventmanagement.integration;

import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.payload.CreateInquiryRequest;
import com.aicc.eventmanagement.payload.SendProposalRequest;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.services.InquiryService;
import com.aicc.eventmanagement.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
@DisplayName("Inquiry Flow Integration Tests")
class InquiryFlowIntegrationTest {

    @Autowired
    private InquiryService inquiryService;

    @Autowired
    private InquiryRepository inquiryRepository;

    private CreateInquiryRequest createRequest;

    @BeforeEach
    void setUp() {
        createRequest = CreateInquiryRequest.builder()
                .clientId(1L)
                .clientName("Integration Test Client")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .requirements("Projector, catering")
                .build();
    }

    @Test
    @DisplayName("Full flow: create inquiry → send proposal → accept proposal")
    void testFullInquiryToProposalFlow() {
        // 1. Create inquiry
        Inquiry created = inquiryService.createInquiry(createRequest);
        assertThat(created.getStatus()).isEqualTo(EventStatus.INQUIRY_SUBMITTED);
        assertThat(created.getId()).isNotNull();

        // 2. Send proposal (as coordinator)
        SendProposalRequest proposalRequest = SendProposalRequest.builder()
                .venue("Main Hall A")
                .price(150000)
                .terms("50% deposit required. Full payment 2 weeks before event.")
                .pricingTier("standard")
                .build();

        Inquiry withProposal = inquiryService.sendProposal(created.getId(), proposalRequest, Role.COORDINATOR);
        assertThat(withProposal.getStatus()).isEqualTo(EventStatus.PROPOSAL_SENT);
        assertThat(withProposal.getProposal()).isNotNull();

        // 3. Accept proposal (as client)
        Inquiry accepted = inquiryService.acceptProposal(withProposal.getId(), Role.CLIENT);
        assertThat(accepted.getStatus()).isEqualTo(EventStatus.PROPOSAL_ACCEPTED);
    }

    @Test
    @DisplayName("Should reject proposal and store reason")
    void testRejectProposal() {
        // Create and send proposal
        Inquiry created = inquiryService.createInquiry(createRequest);
        SendProposalRequest proposalRequest = SendProposalRequest.builder()
                .venue("Main Hall A")
                .price(150000)
                .terms("50% deposit required")
                .build();
        Inquiry withProposal = inquiryService.sendProposal(created.getId(), proposalRequest, Role.COORDINATOR);

        // Reject
        String rejectionReason = "Price too high for our budget";
        Inquiry rejected = inquiryService.rejectProposal(withProposal.getId(), rejectionReason, Role.CLIENT);

        assertThat(rejected.getStatus()).isEqualTo(EventStatus.PROPOSAL_REJECTED);
    }

    @Test
    @DisplayName("Should parse proposal JSON correctly")
    void testProposalJsonStructure() {
        Inquiry created = inquiryService.createInquiry(createRequest);
        SendProposalRequest proposalRequest = SendProposalRequest.builder()
                .venue("Ballroom B")
                .venueId(2L)
                .price(200000)
                .terms("Full payment required")
                .pricingTier("premium")
                .build();

        Inquiry withProposal = inquiryService.sendProposal(created.getId(), proposalRequest, Role.COORDINATOR);

        // Verify JSON was stored
        String proposalJson = withProposal.getProposal();
        assertThat(proposalJson).isNotNull();
        assertThat(proposalJson).contains("Ballroom B");
        assertThat(proposalJson).contains("200000");
        assertThat(proposalJson).contains("premium");
    }

    @Test
    @DisplayName("Event uses client-chosen categories, not event-type default")
    void eventUsesClientChosenCategories() {
        CreateInquiryRequest inquiry = CreateInquiryRequest.builder()
                .clientId(1L)
                .clientName("Category Test Client")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(60))
                .expectedAttendees(100)
                .requestedCategories(List.of("av", "catering"))
                .build();

        Inquiry created = inquiryService.createInquiry(inquiry);

        SendProposalRequest proposal = SendProposalRequest.builder()
                .venue("Main Hall A")
                .price(100000)
                .terms("Standard")
                .categories(List.of("av", "catering"))
                .build();
        inquiryService.sendProposal(created.getId(), proposal, Role.COORDINATOR);

        inquiryService.acceptProposal(created.getId(), null, Role.CLIENT);

        var convert = new com.aicc.eventmanagement.payload.ConvertToEventRequest();
        convert.setName("Category Test Event");
        var event = inquiryService.convertToEvent(created.getId(), convert);

        assertThat(com.aicc.eventmanagement.util.CategoryUtils.split(event.getRequiredCategories()))
                .containsExactlyInAnyOrder("av", "catering");
        assertThat(com.aicc.eventmanagement.util.CategoryUtils.split(event.getRequiredCategories()))
                .doesNotContain("security");
    }

    @Test
    @DisplayName("Client can edit categories at accept time")
    void clientEditsAtAccept() {
        CreateInquiryRequest inquiry = CreateInquiryRequest.builder()
                .clientId(1L)
                .clientName("Category Edit Client")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(50))
                .expectedAttendees(80)
                .requestedCategories(List.of("av", "catering", "security"))
                .build();

        Inquiry created = inquiryService.createInquiry(inquiry);
        SendProposalRequest proposal = SendProposalRequest.builder()
                .venue("Main Hall B")
                .price(90000)
                .terms("Standard")
                .categories(List.of("av", "catering", "security"))
                .build();
        inquiryService.sendProposal(created.getId(), proposal, Role.COORDINATOR);

        inquiryService.acceptProposal(created.getId(), List.of("av", "catering"), Role.CLIENT);

        Inquiry after = inquiryService.getInquiryById(created.getId());
        assertThat(com.aicc.eventmanagement.util.CategoryUtils.split(after.getCategories()))
                .containsExactlyInAnyOrder("av", "catering");
    }
}
