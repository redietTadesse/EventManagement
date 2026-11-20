package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.util.VenueBookingWindow;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor
public class BookingOptionsService {
    private final VenueService venues;
    public record Request(@NotNull LocalDate date, LocalDate endDate,
                          @NotNull @Min(1) Integer attendees,
                          @NotBlank @Pattern(regexp="conference|meeting|exhibition|trade_show|wedding|concert|gala|seminar") String eventType,
                          @NotBlank @Pattern(regexp="THEATRE|CLASSROOM|BANQUET|CABARET|BOARDROOM|U_SHAPE|UNDECIDED") String tableSetup,
                          @Min(0) @Max(14) Integer flexibleDays, Long inquiryId, @Positive Long venueId) {}
    public record Option(Long venueId, String venueName, Integer capacity, LocalDate eventDate, LocalDate endDate,
                         LocalDate bookedFrom, LocalDate bookedThrough, int daysShift, String tableSetup) {}
    public record Result(List<Option> options, int datesChecked, String notice) {}

    @Transactional(readOnly = true)
    public Result search(Request request) {
        LocalDate today = LocalDate.now();
        LocalDate end = request.endDate() == null ? request.date() : request.endDate();
        if (request.date() == null || !request.date().isAfter(today) || end.isBefore(request.date())
                || ChronoUnit.DAYS.between(request.date(), end) > 365)
            throw new BusinessException("Choose future dates in the correct order, covering at most 366 event days.", "INVALID_DATE");
        int flexibility = request.flexibleDays() == null ? 0 : request.flexibleDays();
        if (flexibility < 0 || flexibility > 14) throw new BusinessException("Date flexibility must be between 0 and 14 days.", "INVALID_RANGE");
        List<Integer> shifts = new ArrayList<>(); shifts.add(0);
        for (int day = 1; day <= flexibility; day++) { shifts.add(-day); shifts.add(day); }
        List<Option> options = new ArrayList<>(); int checked = 0;
        for (int shift : shifts) {
            LocalDate start = request.date().plusDays(shift), through = end.plusDays(shift);
            if (!start.isAfter(today)) continue;
            checked++;
            venues.getAvailableForProposal(start, through, request.attendees(), request.eventType(), request.tableSetup(), request.inquiryId())
                    .stream().filter(v -> request.venueId() == null || request.venueId().equals(v.getId()))
                    .sorted(Comparator.comparing((Venue v) -> LayoutCapacity.capacity(v, request.tableSetup()))
                            .thenComparing(Venue::getId))
                    .forEach(venue -> {
                        var window = VenueBookingWindow.forEvent(request.eventType(), start, through,
                                venue.getSetupBufferDays(), venue.getTeardownBufferDays());
                        if (!window.from().isBefore(today)) options.add(new Option(venue.getId(), venue.getName(),
                                LayoutCapacity.capacity(venue, request.tableSetup()), start, through,
                                window.from(), window.through(), shift, request.tableSetup()));
                    });
            if (options.size() >= 6) break;
        }
        return new Result(options.stream().limit(6).toList(), checked,
                "Options do not reserve a venue. The coordinator must agree the proposal with the client and recheck availability before booking."
                        + ("UNDECIDED".equals(request.tableSetup()) ? " Capacity shown is the room maximum; a seating setup must be agreed before signing." : ""));
    }
}
