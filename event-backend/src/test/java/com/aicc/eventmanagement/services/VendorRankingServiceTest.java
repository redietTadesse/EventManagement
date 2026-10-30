package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VendorRankingServiceTest {

    @Mock private VendorRepository vendorRepository;
    @Mock private VendorAssignmentRepository assignmentRepository;
    @Mock private VendorRatingService ratingService;
    @Mock private VendorEligibilityService eligibilityService;
    @InjectMocks private VendorRankingService rankingService;

    private LocalDate eventDate;
    private Vendor first;
    private Vendor second;

    @BeforeEach
    void setUp() {
        eventDate = LocalDate.of(2027, 3, 1);
        first = Vendor.builder().id(1L).companyName("First").serviceCategory("av")
                .isActive(true).insuranceExpiryDate(eventDate.plusDays(5)).rating(1.0).build();
        second = Vendor.builder().id(2L).companyName("Second").serviceCategory("av")
                .isActive(true).insuranceExpiryDate(eventDate.plusDays(5)).rating(5.0).build();
        when(vendorRepository.findByServiceCategoryIn(
                List.of("av", "AV", "audio_visual", "AUDIO_VISUAL"))).thenReturn(List.of(first, second));
        when(eligibilityService.evaluate(any(), eq("av"), eq(eventDate), eq(8L), any(), any()))
                .thenAnswer(invocation -> {
                    Vendor candidate = invocation.getArgument(0);
                    @SuppressWarnings("unchecked") java.util.Set<Long> excluded = invocation.getArgument(5);
                    return excluded.contains(candidate.getId())
                            ? new VendorEligibilityService.EligibilityResult(false, "VENDOR_ALREADY_TRIED", "Already tried")
                            : new VendorEligibilityService.EligibilityResult(true, null, null);
                });
        when(assignmentRepository.findTriedVendorIds(8L, "av")).thenReturn(List.of(1L));
        when(assignmentRepository.countActiveAssignmentsByVendors(anyList())).thenReturn(List.of());
        when(assignmentRepository.countAllAssignmentsByVendors(anyList())).thenReturn(List.of());
        when(ratingService.calculateVendorRatings(anyList())).thenReturn(Map.of(2L, 4.3));
    }

    @Test
    void selectionAfterDeclineChoosesTheNextUntriedEligibleVendor() {
        Optional<VendorRankingService.Selection> selection =
                rankingService.selectForEvent(8L, "conference", "av", eventDate);

        assertThat(selection).isPresent();
        assertThat(selection.get().vendor()).isSameAs(second);
        assertThat(selection.get().reasoning()).contains("\"selectedVendorId\":2");
        assertThat(selection.get().score()).isCloseTo(0.93, within(0.0000001));
    }

    @Test
    void selectionIsEmptyWhenAllEligibleVendorsHaveAlreadyBeenTried() {
        when(assignmentRepository.findTriedVendorIds(8L, "av")).thenReturn(List.of(1L, 2L));

        assertThat(rankingService.selectForEvent(8L, "conference", "av", eventDate)).isEmpty();
    }

    @Test
    void equalScoresUseStableVendorIdTieBreak() {
        when(assignmentRepository.findTriedVendorIds(8L, "av")).thenReturn(List.of());
        when(ratingService.calculateVendorRatings(anyList())).thenReturn(Map.of(1L, 4.3, 2L, 4.3));

        var selection = rankingService.selectForEvent(8L, "conference", "av", eventDate);

        assertThat(selection).isPresent();
        assertThat(selection.get().vendor()).isSameAs(first);
    }
}
