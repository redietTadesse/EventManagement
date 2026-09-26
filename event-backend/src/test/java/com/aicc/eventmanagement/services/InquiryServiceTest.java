package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.payload.ConvertToEventRequest;
import com.aicc.eventmanagement.payload.CreateInquiryRequest;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("InquiryService Tests")
class InquiryServiceTest {

    @Mock
    private InquiryRepository inquiryRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private WorkflowEngine workflowEngine;   // NEW: mock the engine

        @Mock
        private EmailService emailService;

        @Mock
        private UserRepository userRepository;

        @Mock
        private VenueService venueService;

        @Mock
        private VendorService vendorService;

    @InjectMocks
    private InquiryService inquiryService;

    private CreateInquiryRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new CreateInquiryRequest();
        validRequest.setClientId(1L);
        validRequest.setClientName("John Doe");
        validRequest.setEventType("conference");
        validRequest.setEventDate(LocalDate.now().plusDays(30));
        validRequest.setExpectedAttendees(200);
        validRequest.setRequirements("Projector, catering");
    }

    @Test
    @DisplayName("Should create inquiry when request is valid")
    void shouldCreateInquiryWhenValid() {
        Inquiry savedInquiry = Inquiry.builder()
                .id(1L)
                .clientId(validRequest.getClientId())
                .clientName(validRequest.getClientName())
                .eventType(validRequest.getEventType())
                .eventDate(validRequest.getEventDate())
                .expectedAttendees(validRequest.getExpectedAttendees())
                .requirements(validRequest.getRequirements())
                .status(EventStatus.INQUIRY_SUBMITTED)
                .build();

        when(inquiryRepository.save(any(Inquiry.class))).thenReturn(savedInquiry);

        Inquiry result = inquiryService.createInquiry(validRequest);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getClientName()).isEqualTo("John Doe");
        assertThat(result.getStatus()).isEqualTo(EventStatus.INQUIRY_SUBMITTED);
    }

    @Test
    @DisplayName("Should throw exception when event date is in the past")
    void shouldThrowExceptionWhenEventDateInPast() {
        CreateInquiryRequest request = new CreateInquiryRequest();
        request.setClientId(1L);
        request.setClientName("John Doe");
        request.setEventType("conference");
        request.setEventDate(LocalDate.now().minusDays(1));
        request.setExpectedAttendees(200);

        assertThatThrownBy(() -> inquiryService.createInquiry(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Event date cannot be in the past");
    }

    @Test
    @DisplayName("Should get inquiry by ID when exists")
    void shouldGetInquiryByIdWhenExists() {
        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.INQUIRY_SUBMITTED)
                .build();

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));

        Inquiry result = inquiryService.getInquiryById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getClientName()).isEqualTo("John Doe");
    }

    @Test
    @DisplayName("Should throw exception when inquiry not found")
    void shouldThrowExceptionWhenInquiryNotFound() {
        when(inquiryRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inquiryService.getInquiryById(999L))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("Should get all inquiries")
    void shouldGetAllInquiries() {
        List<Inquiry> inquiries = List.of(
                Inquiry.builder().id(1L).clientName("John Doe").status(EventStatus.INQUIRY_SUBMITTED).build(),
                Inquiry.builder().id(2L).clientName("Jane Smith").status(EventStatus.PROPOSAL_SENT).build()
        );

        when(inquiryRepository.findAll()).thenReturn(inquiries);

        List<Inquiry> result = inquiryService.getAllInquiries();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getClientName()).isEqualTo("John Doe");
        assertThat(result.get(1).getClientName()).isEqualTo("Jane Smith");
    }

    @Test
    @DisplayName("Should get inquiries by status")
    void shouldGetInquiriesByStatus() {
        List<Inquiry> inquiries = List.of(
                Inquiry.builder().id(1L).clientName("John Doe").status(EventStatus.INQUIRY_SUBMITTED).build(),
                Inquiry.builder().id(2L).clientName("Jane Smith").status(EventStatus.INQUIRY_SUBMITTED).build()
        );

        when(inquiryRepository.findByStatus(EventStatus.INQUIRY_SUBMITTED)).thenReturn(inquiries);

        List<Inquiry> result = inquiryService.getInquiriesByStatus(EventStatus.INQUIRY_SUBMITTED);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(inquiry -> inquiry.getStatus() == EventStatus.INQUIRY_SUBMITTED);
    }

    @Test
    @DisplayName("Should get inquiries by client")
    void shouldGetInquiriesByClient() {
        List<Inquiry> inquiries = List.of(
                Inquiry.builder().id(1L).clientId(1L).clientName("John Doe").status(EventStatus.INQUIRY_SUBMITTED).build(),
                Inquiry.builder().id(2L).clientId(1L).clientName("John Doe").status(EventStatus.PROPOSAL_SENT).build()
        );

        when(inquiryRepository.findByClientId(1L)).thenReturn(inquiries);

        List<Inquiry> result = inquiryService.getInquiriesByClient(1L);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(inquiry -> inquiry.getClientId().equals(1L));
    }

    // ============================================================
    // FIXED: Valid status transition – now includes Role and mocks engine
    // ============================================================
    @Test
    @DisplayName("Should update inquiry status with valid transition")
    void shouldUpdateInquiryStatusWithValidTransition() {
        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.INQUIRY_SUBMITTED)
                .build();

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));
        when(inquiryRepository.save(any(Inquiry.class))).thenReturn(inquiry);

        // Stub the workflow engine to accept the transition (do nothing)
        doNothing().when(workflowEngine).validateTransition(
                EventStatus.INQUIRY_SUBMITTED,
                EventStatus.PROPOSAL_SENT,
                Role.COORDINATOR
        );

        // Now call with role
        Inquiry result = inquiryService.updateInquiryStatus(1L, EventStatus.PROPOSAL_SENT, Role.COORDINATOR);

        assertThat(result.getStatus()).isEqualTo(EventStatus.PROPOSAL_SENT);
        verify(workflowEngine).validateTransition(EventStatus.INQUIRY_SUBMITTED, EventStatus.PROPOSAL_SENT, Role.COORDINATOR);
    }

    // ============================================================
    // FIXED: Invalid transition – now expects IllegalStateException
    // ============================================================
    @Test
    @DisplayName("Should throw exception for invalid status transition")
    void shouldThrowExceptionForInvalidTransition() {
        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.COMPLETED)   // COMPLETED has no outgoing transitions
                .build();

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));

        // Stub the engine to throw IllegalStateException for this transition
        doThrow(new IllegalStateException("Invalid transition: COMPLETED -> INQUIRY_SUBMITTED"))
                .when(workflowEngine).validateTransition(
                        EventStatus.COMPLETED,
                        EventStatus.INQUIRY_SUBMITTED,
                        Role.COORDINATOR
                );

        // Expect IllegalStateException with matching message
        assertThatThrownBy(() -> inquiryService.updateInquiryStatus(1L, EventStatus.INQUIRY_SUBMITTED, Role.COORDINATOR))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Invalid transition");
    }

    // ============================================================
    // REMAINING TESTS (unchanged, but note that convertToEvent also uses engine)
    // The convertToEvent test doesn't mock engine; we can add stubbing for it.
    // ============================================================

    @Test
    @DisplayName("Should convert inquiry to event when status is PROPOSAL_ACCEPTED")
    void shouldConvertInquiryToEventWhenStatusAccepted() {
        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.PROPOSAL_ACCEPTED)
                .build();

        ConvertToEventRequest request = new ConvertToEventRequest();
        request.setName("Tech Conference 2024");
        request.setVenue("Main Hall");

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(inquiryRepository.save(any(Inquiry.class))).thenReturn(inquiry);

        // Stub the engine for the transition PROPOSAL_ACCEPTED -> EVENT_CREATED
        doNothing().when(workflowEngine).validateTransition(
                EventStatus.PROPOSAL_ACCEPTED,
                EventStatus.EVENT_CREATED,
                Role.COORDINATOR
        );

        Event result = inquiryService.convertToEvent(1L, request);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Tech Conference 2024");
        assertThat(result.getStatus()).isEqualTo(EventStatus.EVENT_CREATED);
    }

    @Test
    @DisplayName("Should throw exception when converting inquiry with invalid status")
    void shouldThrowExceptionWhenConvertingWithInvalidStatus() {
        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.INQUIRY_SUBMITTED)
                .build();

        ConvertToEventRequest request = new ConvertToEventRequest();

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));

        assertThatThrownBy(() -> inquiryService.convertToEvent(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Only accepted proposals can be converted to events");
    }

    @Test
    @DisplayName("Should throw exception when inquiry already has event")
    void shouldThrowExceptionWhenInquiryAlreadyHasEvent() {
        Event existingEvent = Event.builder()
                .id(1L)
                .name("Existing Event")
                .status(EventStatus.EVENT_CREATED)
                .build();

        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.PROPOSAL_ACCEPTED)
                .event(existingEvent)
                .build();

        ConvertToEventRequest request = new ConvertToEventRequest();

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));

        assertThatThrownBy(() -> inquiryService.convertToEvent(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("already has an event associated");
    }

    @Test
    @DisplayName("Should update inquiry with valid data")
    void shouldUpdateInquiryWithValidData() {
        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.INQUIRY_SUBMITTED)
                .build();

        com.aicc.eventmanagement.payload.UpdateInquiryRequest request = new com.aicc.eventmanagement.payload.UpdateInquiryRequest();
        request.setClientName("John Smith");
        request.setExpectedAttendees(250);

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));
        when(inquiryRepository.save(any(Inquiry.class))).thenReturn(inquiry);

        Inquiry result = inquiryService.updateInquiry(1L, request);

        assertThat(result.getClientName()).isEqualTo("John Smith");
        assertThat(result.getExpectedAttendees()).isEqualTo(250);
    }

    @Test
    @DisplayName("Should throw exception when updating inquiry with past date")
    void shouldThrowExceptionWhenUpdatingWithPastDate() {
        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.INQUIRY_SUBMITTED)
                .build();

        com.aicc.eventmanagement.payload.UpdateInquiryRequest request = new com.aicc.eventmanagement.payload.UpdateInquiryRequest();
        request.setEventDate(LocalDate.now().minusDays(1));

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));

        assertThatThrownBy(() -> inquiryService.updateInquiry(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Event date cannot be in the past");
    }

    @Test
    @DisplayName("Should delete inquiry when no event associated")
    void shouldDeleteInquiryWhenNoEvent() {
        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.INQUIRY_SUBMITTED)
                .event(null)
                .build();

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));

        inquiryService.deleteInquiry(1L);

        verify(inquiryRepository).delete(inquiry);
    }

    @Test
    @DisplayName("Should throw exception when deleting inquiry with event")
    void shouldThrowExceptionWhenDeletingInquiryWithEvent() {
        Event existingEvent = Event.builder()
                .id(1L)
                .name("Existing Event")
                .status(EventStatus.EVENT_CREATED)
                .build();

        Inquiry inquiry = Inquiry.builder()
                .id(1L)
                .clientId(1L)
                .clientName("John Doe")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(200)
                .status(EventStatus.INQUIRY_SUBMITTED)
                .event(existingEvent)
                .build();

        when(inquiryRepository.findById(1L)).thenReturn(Optional.of(inquiry));

        assertThatThrownBy(() -> inquiryService.deleteInquiry(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Cannot delete inquiry with associated event");
    }
}