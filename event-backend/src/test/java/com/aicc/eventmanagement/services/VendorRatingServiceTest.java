package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendorRatingServiceTest {

    @Mock private VendorAssignmentRepository assignmentRepository;
    @Mock private VendorRepository vendorRepository;
    @InjectMocks private VendorRatingService ratingService;

    @Test
    void recalculationPersistsTheRoundedClientReviewAverage() {
        Vendor vendor = Vendor.builder().id(3L).companyName("AV Vendor").rating(2.0).build();
        when(vendorRepository.findAll()).thenReturn(List.of(vendor));
        when(assignmentRepository.averageCompletedRatingsByVendors(anyList()))
                .thenReturn(List.<Object[]>of(new Object[]{3L, 4.25}));

        int updated = ratingService.recalculateAllVendorRatings();

        assertThat(updated).isEqualTo(1);
        assertThat(vendor.getRating()).isEqualTo(4.3);
        verify(vendorRepository).save(vendor);
    }

    @Test
    void unreviewedVendorsHaveNoClaimedRating() {
        Vendor vendor = Vendor.builder().id(4L).companyName("New Vendor").rating(3.0).build();
        when(assignmentRepository.averageCompletedRatingsByVendors(anyList())).thenReturn(List.of());

        assertThat(ratingService.calculateVendorRating(vendor)).isZero();
    }
}
