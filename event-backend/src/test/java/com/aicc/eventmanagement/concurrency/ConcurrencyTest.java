package com.aicc.eventmanagement.concurrency;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.entities.Inquiry;
import java.time.LocalDate;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.payload.VendorAssignmentResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.aicc.eventmanagement.services.VendorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Concurrency Tests")
class ConcurrencyTest {

    @Autowired
    private InquiryRepository inquiryRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private VendorAssignmentRepository assignmentRepository;

    @Autowired
    private VendorService vendorService;


    private Inquiry testInquiry;

    @BeforeEach
    void setUp() {
        testInquiry = Inquiry.builder()
                .clientId(1L)
                .clientName("Concurrency Test Client")
                .eventType("conference")
                .eventDate(LocalDate.now().plusDays(30))
                .expectedAttendees(100)
                .requirements("Two microphones and stage lighting")
                .status(EventStatus.PROPOSAL_ACCEPTED)
                .build();
        inquiryRepository.save(testInquiry);
    }

            @Test
            @DisplayName("Vendor assignments load event and inquiry data for response mapping")
            void testVendorAssignmentsCanBeMappedAfterFetch() {
            Vendor vendor = vendorRepository.save(Vendor.builder()
                .companyName("Assignment Read Vendor")
                .serviceCategory("av")
                .build());
            Event event = eventRepository.save(Event.builder()
                .inquiry(testInquiry)
                .name("Assignment Read Event")
                .status(EventStatus.EVENT_CREATED)
                .build());
            assignmentRepository.save(VendorAssignment.builder()
                .event(event)
                .vendor(vendor)
                .vendorName(vendor.getCompanyName())
                .serviceCategory("av")
                    .serviceOrder("Two microphones and stage lighting")
                .status(VendorAssignmentStatus.PENDING)
                .build());

            List<VendorAssignment> assignments = vendorService.getAssignmentsByVendor(vendor.getId());
            List<VendorAssignmentResponse> responses = assignments.stream()
                .map(VendorAssignmentResponse::from)
                .toList();

            assertThat(responses).hasSize(1);
            assertThat(responses.get(0).getEventName()).isEqualTo("Assignment Read Event");
            assertThat(responses.get(0).getEventDate()).isEqualTo(testInquiry.getEventDate());
            assertThat(responses.get(0).getServiceOrder()).isEqualTo("Two microphones and stage lighting");
            }

    @Test
    @DisplayName("Should maintain data integrity under concurrent reads")
    void testConcurrentReads() throws InterruptedException {
        int threadCount = 20;
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        AtomicInteger readCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    Inquiry inquiry = inquiryRepository.findById(testInquiry.getId()).orElse(null);
                    if (inquiry != null) {
                        readCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    // Ignore
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // All reads should succeed
        assertThat(readCount.get()).isEqualTo(threadCount);
    }

    @Test
    @DisplayName("Only one vendor can claim an open assignment")
    void onlyOneVendorWinsAnOpenAssignmentClaim() throws InterruptedException {
        LocalDate eventDate = testInquiry.getEventDate();
        Event event = eventRepository.save(Event.builder()
                .inquiry(testInquiry)
                .name("Open pool claim event")
                .status(EventStatus.AWAITING_VENDORS)
                .requiredCategories("av")
                .build());
        Vendor first = vendorRepository.save(Vendor.builder()
                .companyName("First claim vendor")
                .serviceCategory("av")
                .insuranceExpiryDate(eventDate.plusYears(1))
                .isActive(true)
                .build());
        Vendor second = vendorRepository.save(Vendor.builder()
                .companyName("Second claim vendor")
                .serviceCategory("av")
                .insuranceExpiryDate(eventDate.plusYears(1))
                .isActive(true)
                .build());
        VendorAssignment open = assignmentRepository.save(VendorAssignment.builder()
                .event(event)
                .serviceCategory("av")
                .status(VendorAssignmentStatus.OPEN)
                .build());

        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        AtomicInteger successfulClaims = new AtomicInteger();
        var failures = new java.util.concurrent.ConcurrentLinkedQueue<Exception>();

        for (Vendor candidate : List.of(first, second)) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    vendorService.claimOpenAssignment(open.getId(), candidate.getId());
                    successfulClaims.incrementAndGet();
                } catch (Exception failure) {
                    failures.add(failure);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertThat(doneLatch.await(15, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
        executor.shutdown();

        VendorAssignment claimed = assignmentRepository.findById(open.getId()).orElseThrow();
        assertThat(successfulClaims.get()).isEqualTo(1);
        assertThat(failures).singleElement().isInstanceOfSatisfying(
                com.aicc.eventmanagement.exceptions.BusinessException.class,
                error -> assertThat(error.getErrorCode()).isIn("ASSIGNMENT_ALREADY_CLAIMED", "ASSIGNMENT_NOT_OPEN"));
        assertThat(claimed.getStatus()).isEqualTo(VendorAssignmentStatus.PENDING);
        assertThat(claimed.getRespondedAt()).isNull();
        assertThat(claimed.getAssignedAt()).isNotNull();
        assertThat(List.of(first.getId(), second.getId())).contains(claimed.getVendor().getId());
    }

}
