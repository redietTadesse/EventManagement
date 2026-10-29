package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.VenueBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VenueBookingRepository extends JpaRepository<VenueBooking, Long> {

    @Query("SELECT vb FROM VenueBooking vb WHERE vb.venue.id = :venueId AND vb.bookingDate = :date")
    Optional<VenueBooking> findByVenueAndDate(@Param("venueId") Long venueId, @Param("date") LocalDate date);

    @Query("SELECT vb.venue.id FROM VenueBooking vb WHERE vb.bookingDate = :date AND vb.status = 'CONFIRMED'")
    List<Long> findBookedVenueIdsOn(@Param("date") LocalDate date);

    /**
     * Venues unavailable on a date: confirmed bookings plus holds that have not expired.
     */
    @Query("""
           SELECT vb.venue.id FROM VenueBooking vb
           WHERE vb.bookingDate = :date
             AND (vb.status = 'CONFIRMED'
                  OR (vb.status = 'HELD' AND vb.expiresAt > :now))
           """)
    List<Long> findUnavailableVenueIdsOn(@Param("date") LocalDate date,
                                         @Param("now") LocalDateTime now);

    boolean existsByVenueIdAndBookingDateAndStatus(Long venueId, LocalDate date, VenueBooking.BookingStatus status);

    List<VenueBooking> findByVenueId(Long venueId);

    /**
     * Every row that still blocks a date in the range, with venue and event fetched.
     * open-in-view is false, so the fetch joins are required rather than optional.
     */
    @Query("""
           SELECT vb FROM VenueBooking vb
           JOIN FETCH vb.venue
           LEFT JOIN FETCH vb.event
           WHERE vb.bookingDate BETWEEN :start AND :end
             AND (vb.status = 'CONFIRMED'
                  OR (vb.status = 'HELD' AND vb.expiresAt > :now))
           """)
    List<VenueBooking> findBlockingRowsInRange(@Param("start") LocalDate start,
                                               @Param("end") LocalDate end,
                                               @Param("now") LocalDateTime now);
}