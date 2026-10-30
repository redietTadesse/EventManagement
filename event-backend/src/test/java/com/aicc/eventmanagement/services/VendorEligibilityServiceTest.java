package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VendorEligibilityServiceTest {

    @Mock private VendorBookedDateRepository bookedDateRepository;
    @Mock private VendorAssignmentRepository assignmentRepository;
    @InjectMocks private VendorEligibilityService eligibilityService;

    private final LocalDate eventDate = LocalDate.of(2027, 3, 1);

    @BeforeEach
    void setUp() {
        when(bookedDateRepository.existsByVendorIdAndBookedDate(1L, eventDate)).thenReturn(false);
        when(assignmentRepository.hasConflictingAssignmentOnDate(1L, eventDate)).thenReturn(false);
        when(assignmentRepository.hasConflictingAssignmentOnDateExcludingEvent(1L, eventDate, 8L)).thenReturn(false);
    }

    @Test
    void missingInsuranceExpiryIsAllowedByPolicy() {
        Vendor vendor = vendor("av", null);

        assertThat(eligibilityService.evaluate(vendor, "audio_visual", eventDate,
                null, "conference", Set.of()).eligible()).isTrue();
    }

    @Test
    void insuranceMustExpireStrictlyAfterEventDate() {
        for (LocalDate expiry : new LocalDate[]{eventDate.minusDays(1), eventDate}) {
            var result = eligibilityService.evaluate(vendor("av", expiry), "av", eventDate,
                    null, "conference", Set.of());
            assertThat(result.eligible()).isFalse();
            assertThat(result.code()).isEqualTo("VENDOR_INSURANCE_INVALID");
        }

        assertThat(eligibilityService.evaluate(vendor("av", eventDate.plusDays(1)), "av", eventDate,
                null, "conference", Set.of()).eligible()).isTrue();
    }

    @Test
    void externalCateringIsOnlyEligibleForWeddings() {
        Vendor vendor = vendor("catering", eventDate.plusDays(1));

        var conference = eligibilityService.evaluate(vendor, "catering", eventDate,
                null, "conference", Set.of());
        var wedding = eligibilityService.evaluate(vendor, "catering", eventDate,
                null, "wedding", Set.of());

        assertThat(conference.code()).isEqualTo("INTERNAL_CATERING");
        assertThat(wedding.eligible()).isTrue();
    }

    @Test
    void rejectsInactiveVendorsAndCategoryMismatchesBeforeCheckingAvailability() {
        Vendor inactive = Vendor.builder().id(1L).companyName("Inactive").serviceCategory("av")
                .isActive(false).insuranceExpiryDate(eventDate.plusDays(1)).build();
        Vendor wrongCategory = vendor("catering", eventDate.plusDays(1));

        assertThat(eligibilityService.evaluate(inactive, "av", eventDate,
                null, "conference", Set.of()).code()).isEqualTo("VENDOR_INACTIVE");
        assertThat(eligibilityService.evaluate(wrongCategory, "av", eventDate,
                null, "conference", Set.of()).code()).isEqualTo("VENDOR_CATEGORY_MISMATCH");
    }

    @Test
    void rejectsManuallyBlockedDates() {
        when(bookedDateRepository.existsByVendorIdAndBookedDate(1L, eventDate)).thenReturn(true);

        var result = eligibilityService.evaluate(vendor("av", eventDate.plusDays(1)), "av", eventDate,
                null, "conference", Set.of());

        assertThat(result.code()).isEqualTo("VENDOR_UNAVAILABLE");
        assertThat(result.reason()).contains("booked date");
    }

    @Test
    void excludesAlreadyTriedVendorsAndChecksOtherEventConflicts() {
        Vendor vendor = vendor("av", eventDate.plusDays(1));
        var alreadyTried = eligibilityService.evaluate(vendor, "av", eventDate,
                8L, "conference", Set.of(1L));
        assertThat(alreadyTried.code()).isEqualTo("VENDOR_ALREADY_TRIED");

        when(assignmentRepository.hasConflictingAssignmentOnDateExcludingEvent(1L, eventDate, 8L))
                .thenReturn(true);
        var conflict = eligibilityService.evaluate(vendor, "av", eventDate,
                8L, "conference", Set.of());
        assertThat(conflict.code()).isEqualTo("VENDOR_UNAVAILABLE");
    }

    private Vendor vendor(String category, LocalDate insuranceExpiry) {
        return Vendor.builder().id(1L).companyName("Test Vendor").serviceCategory(category)
                .isActive(true).insuranceExpiryDate(insuranceExpiry).build();
    }
}
