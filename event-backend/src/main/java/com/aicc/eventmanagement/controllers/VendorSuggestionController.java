package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.services.VendorSuggestionService;
import com.aicc.eventmanagement.services.VendorSuggestionService.VendorDetail;
import com.aicc.eventmanagement.services.VendorSuggestionService.VendorSuggestion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/vendor-suggestions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Vendor Suggestions", description = "Smart vendor recommendations for coordinators")
public class VendorSuggestionController {

    private final VendorSuggestionService suggestionService;

    /**
     * Get ranked vendor suggestions for a category and date.
     * Returns vendors sorted by suitability score (highest first).
     */
    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get vendor suggestions for a category and date",
               description = "Returns a ranked list of available vendors with scores and reasoning")
    public ResponseEntity<List<VendorSuggestion>> getSuggestions(
            @PathVariable String category,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long excludeVendorId) {

        log.info("Getting vendor suggestions for category: {}, date: {}, excludeVendorId: {}",
                category, date, excludeVendorId);

        Long clientId = null; // Could be extracted from context in future

        List<VendorSuggestion> suggestions = suggestionService.getSuggestions(
                category, date, excludeVendorId, clientId
        );

        return ResponseEntity.ok(suggestions);
    }

    /**
     * Get the single best match vendor for a category and date.
     */
    @GetMapping("/category/{category}/best")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get the best match vendor suggestion",
               description = "Returns the highest-scored available vendor for the given category and date")
    public ResponseEntity<VendorSuggestion> getBestMatch(
            @PathVariable String category,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long excludeVendorId) {

        log.info("Getting best match for category: {}, date: {}", category, date);

        Long clientId = null;

        return suggestionService.getBestMatch(category, date, excludeVendorId, clientId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Get detailed vendor profile with availability for a specific event date.
     */
    @GetMapping("/vendor/{vendorId}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Get detailed vendor profile with availability",
               description = "Returns full vendor details including past events, current load, and availability")
    public ResponseEntity<VendorDetail> getVendorDetail(
            @PathVariable Long vendorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate eventDate) {

        log.info("Getting vendor detail for vendor: {}, event date: {}", vendorId, eventDate);

        VendorDetail detail = suggestionService.getVendorDetail(vendorId, eventDate);
        return ResponseEntity.ok(detail);
    }
}
