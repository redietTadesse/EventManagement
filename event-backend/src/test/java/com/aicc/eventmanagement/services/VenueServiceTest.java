package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.VenueBookingRepository;
import com.aicc.eventmanagement.repositories.VenueRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VenueServiceTest {

    @Mock private VenueRepository venueRepository;
    @Mock private EventRepository eventRepository;
    @Mock private VenueBookingRepository venueBookingRepository;
    @InjectMocks private VenueService venueService;

    private Venue venue() {
        return Venue.builder().id(7L).name("Main Hall").setupBufferDays(0).teardownBufferDays(0).build();
    }

    @Test
    void confirmedBookingMakesVenueUnavailable() {
        LocalDate date = LocalDate.of(2027, 1, 10);
        when(venueRepository.findById(7L)).thenReturn(Optional.of(venue()));
        when(venueBookingRepository.findBookedVenueIdsOn(date)).thenReturn(List.of(7L));

        assertThat(venueService.isVenueAvailable(7L, date)).isFalse();
        verify(eventRepository, never()).isVenueBookedOn(any(), any(), any());
    }

    @Test
    void fallsBackToLegacyEventBookingsWhenNoBookingRowExists() {
        LocalDate date = LocalDate.of(2027, 1, 10);
        when(venueRepository.findById(7L)).thenReturn(Optional.of(venue()));
        when(venueBookingRepository.findBookedVenueIdsOn(date)).thenReturn(List.of());
        when(eventRepository.isVenueBookedOn(any(), any(), any())).thenReturn(true);

        assertThat(venueService.isVenueAvailable(7L, date)).isFalse();
    }

    @Test
    void refusesToCreateASecondConfirmedBooking() {
        LocalDate date = LocalDate.of(2027, 1, 10);
        when(venueRepository.findById(7L)).thenReturn(Optional.of(venue()));
        when(eventRepository.findById(11L)).thenReturn(Optional.of(Event.builder().id(11L).build()));
        when(venueBookingRepository.countConfirmedBookingsInRange(7L, date, date)).thenReturn(1L);

        assertThatThrownBy(() -> venueService.bookVenue(7L, 11L, date, date))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already booked");
        verify(venueBookingRepository, never()).saveAll(any());
    }
}
