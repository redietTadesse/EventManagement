package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.services.BookingOptionsService;
import com.aicc.eventmanagement.services.RecordAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/booking-options") @RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CLIENT','COORDINATOR','ADMIN')")
public class BookingOptionsController {
    private final BookingOptionsService options;
    private final RecordAccessService access;
    @PostMapping
    @org.springframework.transaction.annotation.Transactional
    public BookingOptionsService.Result search(@Valid @RequestBody BookingOptionsService.Request request, Authentication user) {
        if (request.inquiryId() != null) {
            if (user.getAuthorities().stream().noneMatch(role -> role.getAuthority().equals("ROLE_COORDINATOR") || role.getAuthority().equals("ROLE_ADMIN")))
                throw new org.springframework.security.access.AccessDeniedException("Only authorized staff can search against an inquiry's existing contract hold.");
            access.requireInquiryWriteOwnership(request.inquiryId(), user.getName());
        }
        return options.search(request);
    }
}
