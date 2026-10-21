package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorBookedDateRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("VendorSuggestionService Unit Tests")
class VendorSuggestionServiceTest {

    @Mock
    private VendorRepository vendorRepository;

    @Mock
    private VendorBookedDateRepository bookedDateRepository;

    @Mock
    private VendorAssignmentRepository assignmentRepository;

        @Mock
        private VendorRankingService rankingService;

    @InjectMocks
    private VendorSuggestionService suggestionService;

    private List<Vendor> mockVendors;
    private LocalDate testDate;

    @BeforeEach
    void setUp() {
        testDate = LocalDate.now().plusDays(30);

        mockVendors = Arrays.asList(
                Vendor.builder()
                        .id(1L)
                        .companyName("AV Solutions")
                        .serviceCategory("av")
                        .rating(5)
                        .isActive(true)
                        .build(),
                Vendor.builder()
                        .id(2L)
                        .companyName("Sound & Light Co.")
                        .serviceCategory("av")
                        .rating(4)
                        .isActive(true)
                        .build(),
                Vendor.builder()
                        .id(3L)
                        .companyName("ProStage AV")
                        .serviceCategory("av")
                        .rating(3)
                        .isActive(true)
                        .build()
        );

        when(rankingService.rank(any(), any(), any())).thenAnswer(invocation -> {
                        Set<Long> argumentExcluded = invocation.getArgument(2);
                        Set<Long> excluded = argumentExcluded == null ? Set.of() : argumentExcluded;
            return mockVendors.stream()
                    .filter(v -> !excluded.contains(v.getId()))
                    .map(v -> { double ratingTerm = v.getRating() / 5.0; return new VendorRankingService.Ranked(v, ratingTerm, ratingTerm, 0.0); })
                    .toList();
        });
        when(assignmentRepository.countActiveAndPendingByVendor(anyLong())).thenReturn(0L);
    }

    @Test
    @DisplayName("Should return suggestions ranked by score (highest first)")
    void testGetSuggestionsReturnsRanked() {
        when(vendorRepository.findActiveByCategory("av")).thenReturn(mockVendors);
        when(bookedDateRepository.existsByVendorIdAndBookedDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.hasActiveAssignmentOnDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.countActiveAssignmentsByVendor(1L)).thenReturn(0L);
        when(assignmentRepository.countActiveAssignmentsByVendor(2L)).thenReturn(2L);
        when(assignmentRepository.countActiveAssignmentsByVendor(3L)).thenReturn(5L);

        List<VendorSuggestionService.VendorSuggestion> suggestions =
                suggestionService.getSuggestions("av", testDate, null, null);

        assertThat(suggestions).isNotEmpty();
        assertThat(suggestions.get(0).companyName()).isEqualTo("AV Solutions");
        assertThat(suggestions.get(0).score()).isGreaterThan(suggestions.get(1).score());
    }

    @Test
    @DisplayName("Should return empty list when no vendors available")
    void testGetSuggestionsEmpty() {
        when(vendorRepository.findActiveByCategory("av")).thenReturn(List.of());
                when(rankingService.rank(any(), any(), any())).thenReturn(List.of());

        List<VendorSuggestionService.VendorSuggestion> suggestions =
                suggestionService.getSuggestions("av", testDate, null, null);

        assertThat(suggestions).isEmpty();
    }

    @Test
    @DisplayName("Should mark highest scored vendor as recommended")
    void testRecommendedVendor() {
        when(vendorRepository.findActiveByCategory("av")).thenReturn(mockVendors);
        when(bookedDateRepository.existsByVendorIdAndBookedDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.hasActiveAssignmentOnDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.countActiveAssignmentsByVendor(1L)).thenReturn(0L);
        when(assignmentRepository.countActiveAssignmentsByVendor(2L)).thenReturn(2L);
        when(assignmentRepository.countActiveAssignmentsByVendor(3L)).thenReturn(5L);

        List<VendorSuggestionService.VendorSuggestion> suggestions =
                suggestionService.getSuggestions("av", testDate, null, null);

        assertThat(suggestions.get(0).recommended()).isTrue();
    }

    @Test
    @DisplayName("Should exclude vendor when excludeVendorId is provided")
    void testExcludeVendor() {
        when(vendorRepository.findActiveByCategory("av")).thenReturn(mockVendors);
        when(bookedDateRepository.existsByVendorIdAndBookedDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.hasActiveAssignmentOnDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.countActiveAssignmentsByVendor(2L)).thenReturn(0L);
        when(assignmentRepository.countActiveAssignmentsByVendor(3L)).thenReturn(2L);

        List<VendorSuggestionService.VendorSuggestion> suggestions =
                suggestionService.getSuggestions("av", testDate, 1L, null);

        assertThat(suggestions).hasSize(2);
        assertThat(suggestions).extracting(VendorSuggestionService.VendorSuggestion::vendorId)
                .doesNotContain(1L);
    }

    @Test
    @DisplayName("Should filter out unavailable vendors (booked dates)")
    void testFilterUnavailableVendors() {
        when(rankingService.rank(any(), any(), any())).thenReturn(mockVendors.subList(1, 3).stream()
                .map(v -> { double ratingTerm = v.getRating() / 5.0; return new VendorRankingService.Ranked(v, ratingTerm, ratingTerm, 0.0); })
                .toList());
        when(vendorRepository.findActiveByCategory("av")).thenReturn(mockVendors);
        when(bookedDateRepository.existsByVendorIdAndBookedDate(1L, testDate)).thenReturn(true);
        when(bookedDateRepository.existsByVendorIdAndBookedDate(2L, testDate)).thenReturn(false);
        when(bookedDateRepository.existsByVendorIdAndBookedDate(3L, testDate)).thenReturn(false);
        when(assignmentRepository.hasActiveAssignmentOnDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.countActiveAssignmentsByVendor(2L)).thenReturn(0L);
        when(assignmentRepository.countActiveAssignmentsByVendor(3L)).thenReturn(2L);

        List<VendorSuggestionService.VendorSuggestion> suggestions =
                suggestionService.getSuggestions("av", testDate, null, null);

        assertThat(suggestions).hasSize(2);
        assertThat(suggestions).extracting(VendorSuggestionService.VendorSuggestion::vendorId)
                .doesNotContain(1L);
    }

    @Test
    @DisplayName("Should include reasoning in suggestions")
    void testReasoningIsGenerated() {
        when(vendorRepository.findActiveByCategory("av")).thenReturn(mockVendors);
        when(bookedDateRepository.existsByVendorIdAndBookedDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.hasActiveAssignmentOnDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.countActiveAssignmentsByVendor(1L)).thenReturn(0L);
        when(assignmentRepository.countActiveAssignmentsByVendor(2L)).thenReturn(2L);
        when(assignmentRepository.countActiveAssignmentsByVendor(3L)).thenReturn(5L);

        List<VendorSuggestionService.VendorSuggestion> suggestions =
                suggestionService.getSuggestions("av", testDate, null, null);

        assertThat(suggestions.get(0).reasoning()).isNotEmpty();
    }

    @Test
    @DisplayName("Should return best match from getBestMatch")
    void testGetBestMatch() {
        when(vendorRepository.findActiveByCategory("av")).thenReturn(mockVendors);
        when(bookedDateRepository.existsByVendorIdAndBookedDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.hasActiveAssignmentOnDate(anyLong(), any())).thenReturn(false);
        when(assignmentRepository.countActiveAssignmentsByVendor(1L)).thenReturn(0L);
        when(assignmentRepository.countActiveAssignmentsByVendor(2L)).thenReturn(2L);
        when(assignmentRepository.countActiveAssignmentsByVendor(3L)).thenReturn(5L);

        var bestMatch = suggestionService.getBestMatch("av", testDate, null, null);

        assertThat(bestMatch).isPresent();
        assertThat(bestMatch.get().companyName()).isEqualTo("AV Solutions");
    }

    @Test
    @DisplayName("Should return empty optional when no vendors for best match")
    void testGetBestMatchEmpty() {
        when(vendorRepository.findActiveByCategory("av")).thenReturn(List.of());
                when(rankingService.rank(any(), any(), any())).thenReturn(List.of());

        var bestMatch = suggestionService.getBestMatch("av", testDate, null, null);

        assertThat(bestMatch).isEmpty();
    }
}
