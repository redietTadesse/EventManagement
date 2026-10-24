package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.payload.ActionRequiredResponse;
import com.aicc.eventmanagement.payload.DashboardStatsResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.services.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/coordinator")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Coordinator Dashboard", description = "Coordinator-specific statistics")
public class CoordinatorDashboardController {

    private final DashboardService dashboardService;
    private final EventRepository eventRepository;
    private final InquiryRepository inquiryRepository;
    private final VendorAssignmentRepository assignmentRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('COORDINATOR')")
    @Operation(summary = "Get coordinator dashboard statistics")
    public ResponseEntity<DashboardStatsResponse> getCoordinatorStats() {
        return ResponseEntity.ok(dashboardService.getCoordinatorStats());
    }

    @GetMapping("/action-required")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get the action-required items for the coordinator dashboard")
    public ResponseEntity<ActionRequiredResponse> getActionRequired() {
        List<Event> needsCoordinator = eventRepository.findByStatus(EventStatus.NEEDS_COORDINATOR);
        List<VendorAssignment> openAssignments = assignmentRepository.findByStatus(VendorAssignmentStatus.OPEN);
        LocalDateTime cutoff = LocalDateTime.now().minusDays(3);
        List<Inquiry> staleProposals = inquiryRepository.findStaleByStatus(EventStatus.PROPOSAL_SENT, cutoff);

        return ResponseEntity.ok(ActionRequiredResponse.builder()
                .needsCoordinatorEvents(needsCoordinator)
                .openAssignments(openAssignments)
                .staleProposals(staleProposals)
                .build());
    }
}