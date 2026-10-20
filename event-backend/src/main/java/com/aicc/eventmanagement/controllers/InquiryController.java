package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.payload.ConfirmCategoriesRequest;
import com.aicc.eventmanagement.payload.ConversionPreviewResponse;
import com.aicc.eventmanagement.payload.CreateInquiryRequest;
import com.aicc.eventmanagement.payload.ConvertToEventRequest;
import com.aicc.eventmanagement.payload.InquiryResponse;
import com.aicc.eventmanagement.payload.SendProposalRequest;
import com.aicc.eventmanagement.payload.UpdateInquiryRequest;
import com.aicc.eventmanagement.payload.VendorPreferenceRequest;
import com.aicc.eventmanagement.payload.VendorRecommendationResponse;
import com.aicc.eventmanagement.services.InquiryService;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/inquiries")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Inquiry Management", description = "Endpoints for managing event inquiries")
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    @Operation(summary = "Create a new inquiry", description = "Submits a new event inquiry")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Inquiry created successfully",
                    content = @Content(schema = @Schema(implementation = InquiryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<InquiryResponse> createInquiry(@Valid @RequestBody CreateInquiryRequest request) {
        log.info("Creating inquiry for client: {}", request.getClientName());
        Inquiry created = inquiryService.createInquiry(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(InquiryResponse.from(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get all inquiries", description = "Returns a list of all inquiries (coordinator only)")
    public ResponseEntity<List<InquiryResponse>> getAllInquiries() {
        log.info("Fetching all inquiries");
        List<Inquiry> inquiries = inquiryService.getAllInquiries();
        List<InquiryResponse> responses = inquiries.stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get inquiry by ID")
    public ResponseEntity<InquiryResponse> getInquiryById(@Parameter(description = "Inquiry ID", example = "1") @PathVariable Long id) {
        log.info("Fetching inquiry with id: {}", id);
        Inquiry inquiry = inquiryService.getInquiryById(id);
        return ResponseEntity.ok(InquiryResponse.from(inquiry));
    }

    @GetMapping("/client/{clientId}")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get inquiries by client ID")
    public ResponseEntity<List<InquiryResponse>> getInquiriesByClient(@PathVariable Long clientId) {
        log.info("Fetching inquiries for client: {}", clientId);
        List<Inquiry> inquiries = inquiryService.getInquiriesByClient(clientId);
        List<InquiryResponse> responses = inquiries.stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get inquiries by status")
    public ResponseEntity<List<InquiryResponse>> getInquiriesByStatus(@PathVariable EventStatus status) {
        log.info("Fetching inquiries with status: {}", status);
        List<Inquiry> inquiries = inquiryService.getInquiriesByStatus(status);
        List<InquiryResponse> responses = inquiries.stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    @Operation(summary = "Update inquiry status")
    public ResponseEntity<InquiryResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam EventStatus status,
            @AuthenticationPrincipal UserDetails principal) {

        log.info("Updating inquiry {} status to {} by {}", id, status, principal.getUsername());

        Role userRole = extractRoleFromPrincipal(principal);
        Inquiry updated = inquiryService.updateInquiryStatus(id, status, userRole);
        return ResponseEntity.ok(InquiryResponse.from(updated));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Update inquiry details")
    public ResponseEntity<InquiryResponse> updateInquiry(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInquiryRequest request) {
        log.info("Updating inquiry {}", id);
        Inquiry updated = inquiryService.updateInquiry(id, request);
        return ResponseEntity.ok(InquiryResponse.from(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete inquiry", description = "Deletes an inquiry (admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Inquiry deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Inquiry not found"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<Void> deleteInquiry(@PathVariable Long id) {
        log.info("Deleting inquiry {}", id);
        inquiryService.deleteInquiry(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/convert")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Convert inquiry to event", description = "Converts an accepted inquiry into a full event")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Event created successfully",
                    content = @Content(schema = @Schema(implementation = Event.class))),
            @ApiResponse(responseCode = "400", description = "Inquiry not in accepted state"),
            @ApiResponse(responseCode = "404", description = "Inquiry not found")
    })
    public ResponseEntity<Event> convertToEvent(@PathVariable Long id, @Valid @RequestBody ConvertToEventRequest request) {
        log.info("Converting inquiry {} to event", id);
        Event event = inquiryService.convertToEvent(id, request);
        return ResponseEntity.ok(event);
    }

    @GetMapping("/{id}/conversion-preview")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Preview automatic assignment before converting to event",
               description = "Returns the ranked vendor for each service category, "
                           + "venue availability, and conflict warnings for the "
                           + "upcoming conversion")
    public ResponseEntity<ConversionPreviewResponse> previewConversion(@PathVariable Long id) {
        log.info("Previewing conversion for inquiry {}", id);
        return ResponseEntity.ok(inquiryService.previewConversion(id));
    }

    @GetMapping("/search/event-type")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Search inquiries by event type")
    public ResponseEntity<List<InquiryResponse>> searchByEventType(@RequestParam String eventType) {
        log.info("Searching inquiries by event type: {}", eventType);
        List<Inquiry> inquiries = inquiryService.searchByEventType(eventType);
        List<InquiryResponse> responses = inquiries.stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/search/client-name")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Search inquiries by client name")
    public ResponseEntity<List<InquiryResponse>> searchByClientName(@RequestParam String clientName) {
        log.info("Searching inquiries by client name: {}", clientName);
        List<Inquiry> inquiries = inquiryService.searchByClientName(clientName);
        List<InquiryResponse> responses = inquiries.stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/search/date-range")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Search inquiries by date range")
    public ResponseEntity<List<InquiryResponse>> searchByDateRange(
            @RequestParam @Parameter(description = "Start date (YYYY-MM-DD)") String startDate,
            @RequestParam @Parameter(description = "End date (YYYY-MM-DD)") String endDate) {
        log.info("Searching inquiries by date range: {} to {}", startDate, endDate);
        LocalDate start = LocalDate.parse(startDate);
        LocalDate end = LocalDate.parse(endDate);
        List<Inquiry> inquiries = inquiryService.searchByDateRange(start, end);
        List<InquiryResponse> responses = inquiries.stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/search/attendees")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Search inquiries by attendees range")
    public ResponseEntity<List<InquiryResponse>> searchByAttendees(
            @RequestParam(required = false) Integer minAttendees,
            @RequestParam(required = false) Integer maxAttendees) {
        log.info("Searching inquiries by attendees range: {} to {}", minAttendees, maxAttendees);
        List<Inquiry> inquiries = inquiryService.searchByAttendeesRange(minAttendees, maxAttendees);
        List<InquiryResponse> responses = inquiries.stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/search/advanced")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Advanced search with multiple filters")
    public ResponseEntity<List<InquiryResponse>> advancedSearch(
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String clientName,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        log.info("Advanced search with filters: status={}, clientId={}, eventType={}, clientName={}, startDate={}, endDate={}",
                status, clientId, eventType, clientName, startDate, endDate);

        LocalDate start = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate end = endDate != null ? LocalDate.parse(endDate) : null;

        List<Inquiry> inquiries = inquiryService.advancedSearch(status, clientId, eventType, clientName, start, end);
        List<InquiryResponse> responses = inquiries.stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    // ============================================================
    // PROPOSAL ENDPOINTS
    // ============================================================

    @PostMapping("/{id}/proposal")
    @PreAuthorize("hasRole('COORDINATOR')")
    @Operation(summary = "Send proposal for an inquiry", description = "Coordinator sends proposal to client")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Proposal sent successfully",
                    content = @Content(schema = @Schema(implementation = InquiryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid transition"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Inquiry not found")
    })
    public ResponseEntity<InquiryResponse> sendProposal(
            @PathVariable Long id,
            @Valid @RequestBody SendProposalRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        log.info("Sending proposal for inquiry {} by {}", id, principal.getUsername());

        Role userRole = extractRoleFromPrincipal(principal);

        Inquiry updated = inquiryService.sendProposal(id, request, userRole);
        return ResponseEntity.ok(InquiryResponse.from(updated));
    }

    @PatchMapping("/{id}/accept")
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    @Operation(summary = "Accept proposal", description = "Client accepts the proposal")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Proposal accepted successfully",
                    content = @Content(schema = @Schema(implementation = InquiryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid transition"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Inquiry not found")
    })
    public ResponseEntity<InquiryResponse> acceptProposal(
            @PathVariable Long id,
            @RequestBody(required = false) @Valid ConfirmCategoriesRequest body,
            @AuthenticationPrincipal UserDetails principal) {

        log.info("Accepting proposal for inquiry {} by {}", id, principal.getUsername());

        Role userRole = extractRoleFromPrincipal(principal);
        List<String> finalCategories = body != null ? body.getCategories() : null;

        Inquiry updated = inquiryService.acceptProposal(id, finalCategories, userRole);
        return ResponseEntity.ok(InquiryResponse.from(updated));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    @Operation(summary = "Reject proposal", description = "Client rejects the proposal")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Proposal rejected successfully",
                    content = @Content(schema = @Schema(implementation = InquiryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid transition"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Inquiry not found")
    })
    public ResponseEntity<InquiryResponse> rejectProposal(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal UserDetails principal) {

        log.info("Rejecting proposal for inquiry {} by {}", id, principal.getUsername());

        Role userRole = extractRoleFromPrincipal(principal);

        Inquiry updated = inquiryService.rejectProposal(id, reason, userRole);
        return ResponseEntity.ok(InquiryResponse.from(updated));
    }

    // ============================================================
    // VENDOR RECOMMENDATION ENDPOINTS
    // ============================================================

    @GetMapping("/{id}/recommended-vendors")
    @PreAuthorize("hasAnyRole('CLIENT', 'COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get recommended vendors for an inquiry")
    public ResponseEntity<VendorRecommendationResponse> getRecommendedVendors(@PathVariable Long id) {
        log.info("Fetching vendor recommendations for inquiry {}", id);
        return ResponseEntity.ok(inquiryService.getRecommendedVendors(id));
    }

    @PostMapping("/{id}/vendor-preference")
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    @Operation(summary = "Client records their preferred vendors")
    public ResponseEntity<InquiryResponse> recordVendorPreference(
            @PathVariable Long id,
            @Valid @RequestBody VendorPreferenceRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        log.info("Recording vendor preference for inquiry {} by {}", id, principal.getUsername());

        Role userRole = extractRoleFromPrincipal(principal);
        Inquiry updated = inquiryService.recordVendorPreference(id, request, userRole);
        return ResponseEntity.ok(InquiryResponse.from(updated));
    }

    private Role extractRoleFromPrincipal(UserDetails principal) {
        if (principal == null || principal.getAuthorities().isEmpty()) {
            return Role.CLIENT;
        }

        String roleName = principal.getAuthorities().iterator().next().getAuthority();
        if (roleName.startsWith("ROLE_")) {
            roleName = roleName.substring(5);
        }
        return Role.valueOf(roleName);
    }
}