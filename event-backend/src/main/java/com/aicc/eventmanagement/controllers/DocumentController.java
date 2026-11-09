package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.services.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Document generation endpoints.
 *
 * Deliberately a separate class from EventController: these routes share the
 * /api/v1/events base path but nothing else, and keeping them apart means
 * document work does not collide with event CRUD changes.
 */
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Documents", description = "Generated documents for events")
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping(value = "/{id}/agreement", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    @Operation(summary = "Download the rental agreement",
            description = "Generates a branded facility rental agreement PDF for the event.")
    public ResponseEntity<byte[]> downloadAgreement(@PathVariable Long id) {
        byte[] pdf = documentService.generateRentalAgreement(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + documentService.agreementFileName(id) + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.length)
                .body(pdf);
    }
}