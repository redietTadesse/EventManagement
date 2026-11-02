package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.VenueBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface VenueBookingRepository extends JpaRepository<VenueBooking, Long> {

    @Query("SELECT vb FROM VenueBooking vb WHERE vb.venue.id = :venueId AND vb.bookingDate = :date")
    Optional<VenueBooking> findByVenueAndDate(@Param("venueId") Long venueId, @Param("date") LocalDate date);

    @Query("SELECT vb.venue.id FROM VenueBooking vb WHERE vb.bookingDate = :date AND vb.status = 'CONFIRMED'")
    List<Long> findBookedVenueIdsOn(@Param("date") LocalDate date);

    @Query("SELECT COUNT(vb) FROM VenueBooking vb WHERE vb.venue.id = :venueId AND vb.bookingDate BETWEEN :startDate AND :endDate AND vb.status = 'CONFIRMED'")
    long countConfirmedBookingsInRange(@Param("venueId") Long venueId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // ADDED THIS METHOD FOR THE CHANGE-IMPACT ANALYSIS
    @Query("""
           SELECT COUNT(vb) FROM VenueBooking vb 
           WHERE vb.venue.id = :venueId 
             AND vb.bookingDate BETWEEN :startDate AND :endDate 
             AND vb.status = 'CONFIRMED'
             AND (vb.event IS NULL OR vb.event.id <> :eventId)
           """)
    long countConfirmedBookingsInRangeExcludingEvent(
            @Param("venueId") Long venueId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("eventId") Long eventId);

    List<VenueBooking> findByEventId(Long eventId);

    boolean existsByVenueIdAndBookingDateAndStatus(Long venueId, LocalDate date, VenueBooking.BookingStatus status);

    boolean existsByVenueIdAndBookingDateGreaterThanEqualAndStatus(
            Long venueId, LocalDate date, VenueBooking.BookingStatus status);

    @Query("""
           SELECT CASE WHEN COUNT(vb) > 0 THEN true ELSE false END
           FROM VenueBooking vb JOIN vb.event event JOIN event.inquiry inquiry
           WHERE vb.venue.id = :venueId
             AND vb.bookingDate >= :today
             AND vb.status = 'CONFIRMED'
             AND inquiry.expectedAttendees > :capacity
           """)
    boolean existsFutureBookingExceedingCapacity(@Param("venueId") Long venueId,
                                                 @Param("today") LocalDate today,
                                                 @Param("capacity") Integer capacity);

    List<VenueBooking> findByVenueId(Long venueId);

    boolean existsByVenueId(Long venueId);

    @Query("""
           SELECT vb FROM VenueBooking vb
           JOIN FETCH vb.venue
           LEFT JOIN FETCH vb.event
           WHERE vb.bookingDate BETWEEN :start AND :end
             AND vb.status = 'CONFIRMED'
           """)
    List<VenueBooking> findBlockingRowsInRange(@Param("start") LocalDate start,
                                               @Param("end") LocalDate end);
}
