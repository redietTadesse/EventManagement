package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.enums.IncidentType;
import com.aicc.eventmanagement.services.IncidentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    @Data
    public static class ReportRequest {
        @NotNull(message = "Vendor ID is required")
        private Long vendorId;

        @NotNull(message = "Incident Type is required")
        private IncidentType incidentType;

        private String notes;
    }

    @PostMapping("/{id}/report")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<String> submitReport(@PathVariable Long id, @Valid @RequestBody ReportRequest request) {
        incidentService.submitReport(id, request.getVendorId(), request.getIncidentType(), request.getNotes());
        return ResponseEntity.ok("Incident reported successfully.");
    }
}