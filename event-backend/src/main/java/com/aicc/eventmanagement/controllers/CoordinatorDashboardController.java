package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.ActionRequiredResponse;
import com.aicc.eventmanagement.payload.DashboardStatsResponse;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.services.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import com.aicc.eventmanagement.payload.DashboardUpcomingEvent;

@RestController
@RequestMapping("/api/v1/coordinator")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Coordinator Dashboard", description = "Coordinator-specific statistics")
public class CoordinatorDashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('COORDINATOR')")
    @Operation(summary = "Get coordinator dashboard statistics")
    public ResponseEntity<DashboardStatsResponse> getCoordinatorStats() {
        return ResponseEntity.ok(dashboardService.getCoordinatorStats());
    }

    @GetMapping("/upcoming-events")
    @PreAuthorize("hasRole('COORDINATOR')")
    @Operation(summary = "Get coordinator upcoming events for a date range")
    public ResponseEntity<List<DashboardUpcomingEvent>> getUpcomingEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(dashboardService.getUpcomingEvents(startDate, endDate));
    }

    @GetMapping("/action-required")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get the action-required items for the coordinator dashboard")
    public ResponseEntity<ActionRequiredResponse> getActionRequired() {
        return ResponseEntity.ok(dashboardService.getActionRequired());
    }
}
