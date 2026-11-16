package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.VendorApplication;
import com.aicc.eventmanagement.enums.VendorApplicationStatus;
import com.aicc.eventmanagement.payload.ReviewVendorApplicationRequest;
import com.aicc.eventmanagement.payload.VendorApplicationResponse;
import com.aicc.eventmanagement.payload.VendorApplyRequest;
import com.aicc.eventmanagement.payload.VendorApplyResponse;
import com.aicc.eventmanagement.services.VendorApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/vendor-applications")
@RequiredArgsConstructor
public class VendorApplicationController {

    private final VendorApplicationService applicationService;

    // Public: opened in SecurityConfig for POST on this exact path only.
    @PostMapping
    public ResponseEntity<VendorApplyResponse> apply(@Valid @RequestBody VendorApplyRequest request) {
        VendorApplication saved = applicationService.submit(request);
        return ResponseEntity.ok(new VendorApplyResponse(
                "Application received. Bring your business documents to the AICC office for verification. "
                        + "You can sign in once an administrator approves your application.",
                saved.getCompanyName(),
                saved.getUsername()));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<VendorApplicationResponse>> list(
            @RequestParam(required = false) VendorApplicationStatus status) {
        return ResponseEntity.ok(applicationService.list(status).stream()
                .map(VendorApplicationResponse::from)
                .toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorApplicationResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(VendorApplicationResponse.from(applicationService.get(id)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorApplicationResponse> approve(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReviewVendorApplicationRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        String note = request == null ? null : request.getNote();
        return ResponseEntity.ok(VendorApplicationResponse.from(
                applicationService.approve(id, note, principal.getUsername())));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorApplicationResponse> reject(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReviewVendorApplicationRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        String note = request == null ? null : request.getNote();
        return ResponseEntity.ok(VendorApplicationResponse.from(
                applicationService.reject(id, note, principal.getUsername())));
    }
}
