package com.aicc.eventmanagement.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CategoryUtilsTest {

    @Test
    void readsBothLegacyJsonAndCsvCategoryStorage() {
        assertThat(CategoryUtils.split("[\"AV\", \"catering\", \"security\", \"AV\"]"))
                .containsExactly("av", "catering", "security");
        assertThat(CategoryUtils.split("audio_visual, catering,security,AV"))
                .containsExactly("av", "catering", "security");
        assertThat(CategoryUtils.split("[]")).isEmpty();
    }

    @Test
    void categoryVariantsNormalizeAudioVisualAliases() {
        assertThat(CategoryUtils.categoryVariants("Audio_Visual"))
                .containsExactly("av", "AV", "audio_visual", "AUDIO_VISUAL");
        assertThat(CategoryUtils.canonicalize(" AUDIO_VISUAL ")).isEqualTo("av");
    }

    @Test
    void filtersInternalCateringAndUnknownCategoriesFromExternalAssignment() {
        assertThat(CategoryUtils.externalVendorCategories("conference",
                List.of("venue", "AV", "catering", "not-a-service")))
                .containsExactly("av");
        assertThat(CategoryUtils.externalVendorCategories("wedding", List.of("catering")))
                .containsExactly("catering");
    }

    @Test
    void eventTypeDefaultsAreCanonicalAndKnown() {
        assertThat(CategoryUtils.categoriesForEventType("Conference"))
                .contains("av", "catering");
        assertThat(CategoryUtils.isKnownCategory("audio_visual")).isTrue();
        assertThat(CategoryUtils.isKnownCategory("unlisted")).isFalse();
    }
}
