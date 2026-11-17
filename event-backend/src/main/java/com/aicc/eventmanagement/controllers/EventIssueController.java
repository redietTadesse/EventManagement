package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.IssuePayload.*;
import com.aicc.eventmanagement.services.EventIssueService;
import com.aicc.eventmanagement.services.RecordAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'VENDOR')")
public class EventIssueController {
    private final EventIssueService service;
    private final RecordAccessService recordAccessService;

    @GetMapping("/events/{eventId}/issues")
    public List<View> list(@PathVariable Long eventId, @AuthenticationPrincipal UserDetails user) {
        return service.list(eventId, user.getUsername());
    }
    @Transactional
    @PostMapping("/events/{eventId}/issues")
    @ResponseStatus(HttpStatus.CREATED)
    public View create(@PathVariable Long eventId, @Valid @RequestBody Create request,
                       @AuthenticationPrincipal UserDetails user) {
        recordAccessService.requireEventWriteOwnership(eventId, user.getUsername());
        return service.create(eventId, request, user.getUsername());
    }
    @GetMapping("/events/{eventId}/issue-responsibles")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public List<Person> people(@PathVariable Long eventId, @AuthenticationPrincipal UserDetails user) {
        return service.people(eventId, user.getUsername());
    }
    @GetMapping("/issues")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public List<View> outstanding() {
        return service.outstanding();
    }
    @Transactional
    @PutMapping("/issues/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public View edit(@PathVariable Long id, @Valid @RequestBody Edit request,
                     @AuthenticationPrincipal UserDetails user) {
        recordAccessService.requireIssueWriteOwnership(id, user.getUsername());
        return service.edit(id, request, user.getUsername());
    }
    @Transactional
    @PostMapping("/issues/{id}/updates")
    public View note(@PathVariable Long id, @Valid @RequestBody Note request,
                     @AuthenticationPrincipal UserDetails user) {
        recordAccessService.requireIssueWriteOwnership(id, user.getUsername());
        return service.note(id, request, user.getUsername());
    }
}
