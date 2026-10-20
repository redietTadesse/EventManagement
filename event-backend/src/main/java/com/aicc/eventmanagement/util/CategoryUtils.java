package com.aicc.eventmanagement.util;

import java.util.Arrays;
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
                .map(String::trim)
                .distinct()
                .collect(Collectors.joining(","));
    }
}