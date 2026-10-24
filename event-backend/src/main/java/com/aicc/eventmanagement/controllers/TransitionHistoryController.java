package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.TransitionHistory;
import com.aicc.eventmanagement.repositories.TransitionHistoryRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/history")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Transition History", description = "Audit trail for inquiry and event status changes")
public class TransitionHistoryController {

    private final TransitionHistoryRepository historyRepository;

    @GetMapping("/inquiry/{inquiryId}")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get transition history for an inquiry")
    public ResponseEntity<List<TransitionHistory>> getInquiryHistory(@PathVariable String inquiryId) {
        log.info("Fetching history for inquiry {}", inquiryId);
        List<TransitionHistory> history = historyRepository
                .findByReferenceTypeAndReferenceIdOrderByOccurredAtDesc("INQUIRY", inquiryId);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get transition history for an event")
    public ResponseEntity<List<TransitionHistory>> getEventHistory(@PathVariable String eventId) {
        log.info("Fetching history for event {}", eventId);
        List<TransitionHistory> history = historyRepository
                .findByReferenceTypeAndReferenceIdOrderByOccurredAtDesc("EVENT", "EVENT-" + eventId);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Get the 100 most recent transitions")
    public ResponseEntity<List<TransitionHistory>> getRecentHistory() {
        log.info("Fetching recent transitions");
        List<TransitionHistory> history = historyRepository
                .findAllByOrderByOccurredAtDesc(PageRequest.of(0, 100));
        return ResponseEntity.ok(history);
    }
}