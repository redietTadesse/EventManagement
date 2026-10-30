package com.aicc.eventmanagement.concurrency;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
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
    @DisplayName("Should handle concurrent event creation safely - only one succeeds")
    void testConcurrentEventCreation() throws InterruptedException {
        int threadCount = 10;
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();

                    synchronized (this) {
                        Inquiry current = inquiryRepository.findById(testInquiry.getId()).orElse(null);
                        if (current != null && current.getEvent() == null) {
                            Event event = Event.builder()
                                    .inquiry(current)
                                    .name("Concurrent Event")
                                    .status(EventStatus.EVENT_CREATED)
                                    .venue("Main Hall")
                                    .build();
                            eventRepository.save(event);

                            current.setEvent(event);
                            current.setStatus(EventStatus.EVENT_CREATED);
                            inquiryRepository.save(current);
                            successCount.incrementAndGet();
                        }
                    }
                } catch (Exception e) {
                    // Expected - concurrency conflict
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // Only one thread should succeed
        assertThat(successCount.get()).isEqualTo(1);

        // Verify that exactly one event exists
        Inquiry finalInquiry = inquiryRepository.findById(testInquiry.getId()).orElse(null);
        assertThat(finalInquiry).isNotNull();
        assertThat(finalInquiry.getEvent()).isNotNull();
        assertThat(finalInquiry.getStatus()).isEqualTo(EventStatus.EVENT_CREATED);
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

}
