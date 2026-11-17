package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.payload.EventResponse;
import com.aicc.eventmanagement.services.BookingAgreementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/v1/inquiries/{id}/booking-agreement")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CLIENT','COORDINATOR')")
public class BookingAgreementController {
    private final BookingAgreementService agreements;

    public record Signature(String name, String revision, boolean consent) {}
    public record Rejection(String reason, String receiptUploadedAt) {}
    public record Verification(String receiptUploadedAt) {}

    @GetMapping
    public BookingAgreementService.View view(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        return agreements.view(id, user.getUsername());
    }

    @PostMapping("/signature")
    public BookingAgreementService.View sign(@PathVariable Long id, @RequestBody Signature signature,
                                             @AuthenticationPrincipal UserDetails user) {
        if (!signature.consent()) {
            throw new com.aicc.eventmanagement.exceptions.BusinessException(
                    "Confirm that you agree to the terms before signing.", "SIGNATURE_CONSENT_REQUIRED");
        }
        return agreements.sign(id, user.getUsername(), signature.name(), signature.revision());
    }

    @PostMapping(value = "/receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public BookingAgreementService.View upload(@PathVariable Long id, @RequestParam("receipt") MultipartFile receipt,
                                               @AuthenticationPrincipal UserDetails user) throws IOException {
        return agreements.upload(id, user.getUsername(), receipt.getBytes());
    }

    @GetMapping("/receipt")
    public ResponseEntity<byte[]> download(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        var receipt = agreements.receipt(id, user.getUsername());
        String extension = receipt.type().equals("application/pdf") ? "pdf" : receipt.type().equals("image/png") ? "png" : "jpg";
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(receipt.type()))
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("receipt." + extension).build().toString())
                .body(receipt.contents());
    }

    @PostMapping("/receipt/reject")
    public BookingAgreementService.View reject(@PathVariable Long id, @RequestBody Rejection rejection,
                                               @AuthenticationPrincipal UserDetails user) {
        return agreements.reject(id, user.getUsername(), rejection.reason(), rejection.receiptUploadedAt());
    }

    @PostMapping("/receipt/verify")
    public EventResponse verify(@PathVariable Long id, @RequestBody Verification verification,
                                @AuthenticationPrincipal UserDetails user) {
        return EventResponse.from(agreements.verifyAndBook(id, user.getUsername(), verification.receiptUploadedAt()));
    }
}
