package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.VendorApplication;
import com.aicc.eventmanagement.enums.VendorApplicationStatus;

import java.time.LocalDateTime;

public record VendorApplicationResponse(
        Long id,
        String companyName,
        String contactPerson,
        String email,
        String phone,
        String serviceCategory,
        String description,
        String website,
        Integer establishedYear,
        String username,
        VendorApplicationStatus status,
        String reviewNote,
        LocalDateTime reviewedAt,
        Long vendorId,
        LocalDateTime createdAt) {

    public static VendorApplicationResponse from(VendorApplication a) {
        return new VendorApplicationResponse(
                a.getId(),
                a.getCompanyName(),
                a.getContactPerson(),
                a.getEmail(),
                a.getPhone(),
                a.getServiceCategory(),
                a.getDescription(),
                a.getWebsite(),
                a.getEstablishedYear(),
                a.getUsername(),
                a.getStatus(),
                a.getReviewNote(),
                a.getReviewedAt(),
                a.getVendorId(),
                a.getCreatedAt());
    }
}