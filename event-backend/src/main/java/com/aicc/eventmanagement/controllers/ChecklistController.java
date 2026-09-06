package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.payload.ChecklistResponse;
import com.aicc.eventmanagement.payload.CreateChecklistRequest;
import com.aicc.eventmanagement.payload.UpdateChecklistRequest;
import com.aicc.eventmanagement.services.ChecklistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/checklists")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Checklist Management", description = "Endpoints for managing event checklists")
public class ChecklistController {

    private final ChecklistService checklistService;

    @PostMapping
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Create a checklist item", description = "Creates a new checklist item for an event")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Checklist item created successfully",
                    content = @Content(schema = @Schema(implementation = ChecklistResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<ChecklistResponse> createChecklist(@Valid @RequestBody CreateChecklistRequest request) {
        log.info("Creating checklist item for event: {}", request.getEventId());
        Checklist created = checklistService.createChecklist(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ChecklistResponse.from(created));
    }

    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT', 'VENDOR')")
    @Operation(summary = "Get checklist items by event ID")
    public ResponseEntity<List<ChecklistResponse>> getChecklistByEvent(@PathVariable Long eventId) {
        log.info("Fetching checklist for event: {}", eventId);
        List<Checklist> checklists = checklistService.getChecklistByEvent(eventId);
        List<ChecklistResponse> responses = checklists.stream()
                .map(ChecklistResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT', 'VENDOR')")
    @Operation(summary = "Get checklist item by ID")
    public ResponseEntity<ChecklistResponse> getChecklistById(
            @Parameter(description = "Checklist ID", example = "1") @PathVariable Long id) {
        log.info("Fetching checklist item with id: {}", id);
        Checklist checklist = checklistService.getChecklistById(id);
        return ResponseEntity.ok(ChecklistResponse.from(checklist));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'VENDOR')")
    @Operation(summary = "Mark checklist item as complete")
    public ResponseEntity<ChecklistResponse> markAsComplete(@PathVariable Long id) {
        log.info("Marking checklist item {} as complete", id);
        Checklist updated = checklistService.markAsComplete(id);
        return ResponseEntity.ok(ChecklistResponse.from(updated));
    }

    @PatchMapping("/{id}/incomplete")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Mark checklist item as incomplete")
    public ResponseEntity<ChecklistResponse> markAsIncomplete(@PathVariable Long id) {
        log.info("Marking checklist item {} as incomplete", id);
        Checklist updated = checklistService.markAsIncomplete(id);
        return ResponseEntity.ok(ChecklistResponse.from(updated));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Update checklist item")
    public ResponseEntity<ChecklistResponse> updateChecklist(
            @PathVariable Long id,
            @Valid @RequestBody UpdateChecklistRequest request) {
        log.info("Updating checklist item {}", id);
        Checklist updated = checklistService.updateChecklist(id, request);
        return ResponseEntity.ok(ChecklistResponse.from(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete checklist item", description = "Deletes a checklist item (admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Checklist item deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Checklist item not found"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<Void> deleteChecklist(@PathVariable Long id) {
        log.info("Deleting checklist item {}", id);
        checklistService.deleteChecklist(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/event/{eventId}/pending")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN', 'CLIENT', 'VENDOR')")
    @Operation(summary = "Get pending checklist items for an event")
    public ResponseEntity<List<ChecklistResponse>> getPendingChecklist(@PathVariable Long eventId) {
        log.info("Fetching pending checklist items for event: {}", eventId);
        List<Checklist> checklists = checklistService.getPendingChecklist(eventId);
        List<ChecklistResponse> responses = checklists.stream()
                .map(ChecklistResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }
}