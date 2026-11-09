package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.DashboardStatsResponse;
import com.aicc.eventmanagement.services.DashboardService;
import com.aicc.eventmanagement.services.RevenueDashboardService;
import com.aicc.eventmanagement.exceptions.BusinessException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin Dashboard", description = "Aggregate statistics for administrators")
public class DashboardController {

    private final DashboardService dashboardService;
    private final RevenueDashboardService revenueDashboardService;

    @GetMapping("/outlook")
    @PreAuthorize("hasRole('ADMIN')")
    public DashboardService.Outlook getOutlook() {
        return dashboardService.getOutlook();
    }

    @GetMapping("/lifecycle")
    @PreAuthorize("hasRole('ADMIN')")
    public DashboardService.LifecycleSummary getLifecycle() {
        return dashboardService.getLifecycle();
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    public RevenueDashboardService.Summary getRevenue(@RequestParam(defaultValue = "6") int months) {
        if (months != 3 && months != 6 && months != 12) {
            throw new BusinessException("Choose a 3, 6, or 12 month period.", "INVALID_REPORT_PERIOD");
        }
        return revenueDashboardService.summarize(months);
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get dashboard statistics (admin only)",
            description = "Total users, active users, active vendors, total events, and events grouped by status")
    public ResponseEntity<DashboardStatsResponse> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }
}
