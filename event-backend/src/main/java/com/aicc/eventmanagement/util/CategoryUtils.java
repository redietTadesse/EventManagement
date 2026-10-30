package com.aicc.eventmanagement.util;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class CategoryUtils {

    private CategoryUtils() {}

    public static final Map<String, List<String>> EVENT_TYPE_DEFAULTS = Map.of(
            "conference", List.of("venue", "av", "catering", "security", "registration"),
            "wedding", List.of("venue", "catering", "photography", "music", "flowers"),
            "trade_show", List.of("venue", "booth_setup", "security", "cleaning", "exhibitors"),
            "exhibition", List.of("venue", "booth_setup", "security", "cleaning", "exhibitors"),
            "concert", List.of("venue", "stage_setup", "av", "security", "artists"),
            "gala", List.of("venue", "catering", "photography", "music", "security"),
            "seminar", List.of("venue", "av", "catering")
    );

    private static final Map<String, String> CATEGORY_ALIASES = Map.of(
            "audio_visual", "av"
    );

    private static final List<String> ALL_CATEGORIES = EVENT_TYPE_DEFAULTS.values().stream()
            .flatMap(Collection::stream)
            .map(CategoryUtils::canonicalize)
            .distinct()
            .sorted()
            .toList();

    public static String canonicalize(String category) {
        if (category == null) return null;
        String normalized = category.trim().toLowerCase(java.util.Locale.ROOT);
        return CATEGORY_ALIASES.getOrDefault(normalized, normalized);
    }

    public static List<String> categoryVariants(String category) {
        String canonical = canonicalize(category);
        if (canonical == null || canonical.isBlank()) return List.of();
        if ("av".equals(canonical)) return List.of("av", "AV", "audio_visual", "AUDIO_VISUAL");
        return List.of(canonical, canonical.toUpperCase(java.util.Locale.ROOT));
    }

    public static List<String> allCategories() {
        return ALL_CATEGORIES;
    }

    public static boolean isKnownCategory(String category) {
        String canonical = canonicalize(category);
        return canonical != null && allCategories().contains(canonical);
    }

    public static List<String> categoriesForEventType(String eventType) {
        return EVENT_TYPE_DEFAULTS.getOrDefault(normalizeEventType(eventType), List.of());
    }

    public static List<String> externalVendorCategories(String eventType, Collection<String> selected) {
        Collection<String> source = selected == null || selected.isEmpty()
                ? categoriesForEventType(eventType)
                : selected;
        return source.stream()
                .map(CategoryUtils::canonicalize)
                .filter(category -> category != null && !category.isBlank())
                .filter(ALL_CATEGORIES::contains)
                .filter(category -> !"catering".equals(category) || "wedding".equals(normalizeEventType(eventType)))
                .distinct()
                .toList();
    }

    public static String normalizeEventType(String eventType) {
        return eventType == null ? "" : eventType.trim().toLowerCase(java.util.Locale.ROOT);
    }

    public static List<String> split(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    public static String join(List<String> categories) {
        if (categories == null || categories.isEmpty()) return null;
        return categories.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(CategoryUtils::canonicalize)
                .distinct()
                .collect(Collectors.joining(","));
    }
}
