package com.aicc.eventmanagement.util;

import java.time.LocalDate;

public record VenueBookingWindow(LocalDate from, LocalDate through) {
    public static VenueBookingWindow forEvent(
            String type, LocalDate start, LocalDate end, int setup, int teardown) {
        String kind = type == null ? "" : type.strip().toLowerCase(java.util.Locale.ROOT);
        boolean meeting = kind.equals("meeting");
        boolean exhibition = kind.equals("exhibition") || kind.equals("trade_show");
        LocalDate from = start.minusDays(meeting ? 1 : setup);
        LocalDate through = (end == null ? start : end)
                .plusDays(meeting ? 1 : teardown);
        if (exhibition && through.isBefore(from.plusDays(6))) through = from.plusDays(6);
        return new VenueBookingWindow(from, through);
    }
}
