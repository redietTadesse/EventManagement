package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.util.CategoryUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Set;

/** The single rule evaluator used before a vendor can be offered or assigned. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VendorEligibilityService {

    private final VendorBookedDateRepository bookedDateRepository;
    private final VendorAssignmentRepository assignmentRepository;

    public EligibilityResult evaluate(Vendor vendor, String category, LocalDate eventDate,
                                     Long eventId, String eventType, Set<Long> excludedVendorIds) {
        if (vendor == null) return ineligible("VENDOR_NOT_FOUND", "Vendor does not exist");
        if (eventDate == null) return ineligible("INVALID_EVENT_DATE", "Event date is required");
        if (!vendor.isActive()) return ineligible("VENDOR_INACTIVE", "Vendor is inactive");

        String required = CategoryUtils.canonicalize(category);
        String offered = CategoryUtils.canonicalize(vendor.getServiceCategory());
        if (!CategoryUtils.isKnownCategory(required) || !required.equals(offered)) {
            return ineligible("VENDOR_CATEGORY_MISMATCH", "Vendor does not offer the requested service category");
        }
        if ("catering".equals(required)
                && !"wedding".equals(CategoryUtils.normalizeEventType(eventType))) {
            return ineligible("INTERNAL_CATERING", "Catering is an in-house service for non-wedding events");
        }
        if (excludedVendorIds != null && excludedVendorIds.contains(vendor.getId())) {
            return ineligible("VENDOR_ALREADY_TRIED", "Vendor already declined or received this service for the event");
        }

        // Missing expiry is allowed by the confirmed prototype policy. A recorded
        // expiry must be strictly after the event date to cover the full event day.
        if (vendor.getInsuranceExpiryDate() != null
                && !vendor.getInsuranceExpiryDate().isAfter(eventDate)) {
            return ineligible("VENDOR_INSURANCE_INVALID", "Insurance expires before the event date");
        }
        if (bookedDateRepository.existsByVendorIdAndBookedDate(vendor.getId(), eventDate)) {
            return ineligible("VENDOR_UNAVAILABLE", "Vendor has a booked date on the event date");
        }

        boolean hasConflict = eventId == null
                ? assignmentRepository.hasConflictingAssignmentOnDate(vendor.getId(), eventDate)
                : assignmentRepository.hasConflictingAssignmentOnDateExcludingEvent(vendor.getId(), eventDate, eventId);
        if (hasConflict) {
            return ineligible("VENDOR_UNAVAILABLE", "Vendor has a conflicting pending or accepted assignment");
        }
        return new EligibilityResult(true, null, null);
    }

    private EligibilityResult ineligible(String code, String reason) {
        return new EligibilityResult(false, code, reason);
    }

    public record EligibilityResult(boolean eligible, String code, String reason) { }
}
