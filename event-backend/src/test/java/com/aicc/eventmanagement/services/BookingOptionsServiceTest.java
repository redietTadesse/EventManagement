package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Venue;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.stream.LongStream;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class BookingOptionsServiceTest {
    @Test
    void searchKeepsTheRequestedRoomEvenWhenOtherRoomsFillTheFirstSixPlaces() {
        var venues = mock(VenueService.class);
        var search = new BookingOptionsService(venues);
        var day = LocalDate.now().plusDays(90);
        var rooms = LongStream.rangeClosed(1, 8).mapToObj(id -> Venue.builder().id(id)
                .name("Room " + id).capacity(100 + (int)id).active(true).build()).toList();
        when(venues.getAvailableForProposal(day, day, 80, "meeting", "THEATRE", null)).thenReturn(rooms);
        var fixed = search.search(new BookingOptionsService.Request(day, day, 80, "meeting", "THEATRE", 0, null, 8L));
        assertThat(fixed.options()).singleElement().satisfies(option -> {
            assertThat(option.venueId()).isEqualTo(8L);
            assertThat(option.bookedFrom()).isEqualTo(day.minusDays(1));
            assertThat(option.bookedThrough()).isEqualTo(day.plusDays(1));
        });
        var unrestricted = search.search(new BookingOptionsService.Request(day, day, 80, "meeting", "THEATRE", 0, null, null));
        assertThat(unrestricted.options()).hasSize(6);
        var absent = search.search(new BookingOptionsService.Request(day, day, 80, "meeting", "THEATRE", 0, null, 20L));
        assertThat(absent.options()).isEmpty();
    }
}
