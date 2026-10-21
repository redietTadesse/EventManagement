package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.VendorTrailResponse;
import com.aicc.eventmanagement.services.VendorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Vendor Trail", description = "Per-category history of vendor offers for an event")
public class VendorTrailController {

    private final VendorService vendorService;

    @GetMapping("/{eventId}/vendor-trail")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get the vendor trail for an event",
            description = "Every vendor attempt per service category, in order, with the "
                    + "ranking score and selection reason recorded when each offer was made")
    public ResponseEntity<VendorTrailResponse> getVendorTrail(@PathVariable Long eventId) {
        return ResponseEntity.ok(vendorService.getVendorTrail(eventId));
    }
}