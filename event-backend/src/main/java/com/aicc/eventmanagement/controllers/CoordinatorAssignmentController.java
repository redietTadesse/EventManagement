package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.CoordinatorAssignmentPayload.*;
import com.aicc.eventmanagement.services.CoordinatorAssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
public class CoordinatorAssignmentController {
    private final CoordinatorAssignmentService service;
    @GetMapping("/inquiries/{id}/coordinator")
    public Ownership get(@PathVariable Long id) { return service.get(id); }
    @PostMapping("/inquiries/{id}/coordinator/claim")
    @PreAuthorize("hasRole('COORDINATOR')")
    public Ownership claim(@PathVariable Long id, @AuthenticationPrincipal UserDetails actor) {
        return service.claim(id, actor.getUsername());
    }
    @PutMapping("/inquiries/{id}/coordinator")
    @PreAuthorize("hasRole('ADMIN')")
    public Ownership assign(@PathVariable Long id, @Valid @RequestBody Assign request,
                            @AuthenticationPrincipal UserDetails actor) {
        return service.assign(id, request, actor.getUsername());
    }
    @GetMapping("/coordinators/workload")
    public List<Workload> workload() { return service.workloads(); }
}
