package com.aicc.eventmanagement.util;

import java.util.List;
import java.util.Map;

public final class CategoryUtils {

    public static final Map<String, List<String>> EVENT_TYPE_DEFAULTS = Map.of(
            "conference", List.of("av", "catering", "security"),
            "wedding", List.of("catering", "photography", "music"),
            "trade_show", List.of("av", "security", "cleaning"),
            "exhibition", List.of("av", "security", "cleaning"),
            "concert", List.of("av", "security", "music"),
            "gala", List.of("catering", "photography", "music", "security"),
            "seminar", List.of("av", "catering")
    );

    private CategoryUtils() {
    }

    public static String join(List<String> categories) {
        if (categories == null || categories.isEmpty()) {
            return null;
        }
        return String.join(",", categories.stream().filter(c -> c != null && !c.isBlank()).toList());
    }

    public static List<String> split(String joined) {
        if (joined == null || joined.isBlank()) {
            return List.of();
        }
        return List.of(joined.split(","));
    }
}
