package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.DashboardStatsResponse;
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

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin Dashboard", description = "Aggregate statistics for administrators")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get dashboard statistics (admin only)",
            description = "Total users, active users, active vendors, total events, and events grouped by status")
    public ResponseEntity<DashboardStatsResponse> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }
}

@RestController
@RequestMapping("/api/v1/coordinator")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Coordinator Dashboard", description = "Coordinator-specific statistics")
public class CoordinatorDashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('COORDINATOR')")
    @Operation(summary = "Get coordinator dashboard statistics",
            description = "Active vendors, total events, and events grouped by status for coordinators")
    public ResponseEntity<DashboardStatsResponse> getCoordinatorStats() {
        return ResponseEntity.ok(dashboardService.getCoordinatorStats());
    }
}