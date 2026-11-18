package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.payload.CoordinatorReportRequest;
import com.aicc.eventmanagement.payload.PostEventReportResponse;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.services.IncidentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
public class IncidentReviewController {

    private final IncidentService incidentService;
    private final UserRepository userRepository;

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('COORDINATOR','ADMIN')")
    public ResponseEntity<List<PostEventReportResponse>> pending() {
        return ResponseEntity.ok(incidentService.getPendingReports());
    }

    @GetMapping("/pending/count")
    @PreAuthorize("hasAnyRole('COORDINATOR','ADMIN')")
    public ResponseEntity<Long> pendingCount() {
        return ResponseEntity.ok(incidentService.countPendingReports());
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('COORDINATOR','ADMIN')")
    public ResponseEntity<PostEventReportResponse> confirm(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {
        Long coordinatorId = resolveUserId(principal);
        return ResponseEntity.ok(incidentService.confirmReport(id, coordinatorId));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('COORDINATOR','ADMIN')")
    public ResponseEntity<PostEventReportResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) RejectRequest body,
            @AuthenticationPrincipal UserDetails principal) {
        Long coordinatorId = resolveUserId(principal);
        String reason = body == null ? null : body.reason();
        return ResponseEntity.ok(incidentService.rejectReport(id, coordinatorId, reason));
    }

    @PostMapping("/coordinator-report")
    @PreAuthorize("hasAnyRole('COORDINATOR','ADMIN')")
    public ResponseEntity<PostEventReportResponse> coordinatorReport(
            @RequestBody CoordinatorReportRequest body,
            @AuthenticationPrincipal UserDetails principal) {
        Long coordinatorId = resolveUserId(principal);
        return ResponseEntity.ok(incidentService.submitCoordinatorReport(
                body.eventId(), body.vendorId(),
                body.incidentType(), body.notes(), coordinatorId));
    }

    private Long resolveUserId(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new BusinessException(
                        "Authenticated account not found", "USER_NOT_FOUND"))
                .getId();
    }

    public record RejectRequest(String reason) {}
}