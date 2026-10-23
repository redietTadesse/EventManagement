package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional; // <--- THIS WAS MISSING!

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    // ===== EXISTING METHODS (keep these) =====
    List<Event> findByStatus(EventStatus status);

    // ===== ADD THESE TWO METHODS =====

    /**
     * Checks if a venue is booked on a specific date.
     * A venue is "booked" if there's an event at that venue on that date,
     * and the event is in a non-cancelled state.
     */
    @Query("""
        SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END
        FROM Event e
        WHERE e.venueId = :venueId
          AND e.inquiry.eventDate = :date
          AND e.status NOT IN :excludedStatuses
    """)
    boolean isVenueBookedOn(
        @Param("venueId") Long venueId,
        @Param("date") LocalDate date,
        @Param("excludedStatuses") List<EventStatus> excludedStatuses
    );

    /**
     * Returns all venue IDs that are booked on a given date.
     */
    @Query("""
        SELECT DISTINCT e.venueId
        FROM Event e
        WHERE e.inquiry.eventDate = :date
          AND e.venueId IS NOT NULL
          AND e.status NOT IN :excludedStatuses
    """)
    List<Long> findBookedVenueIdsOn(
        @Param("date") LocalDate date,
        @Param("excludedStatuses") List<EventStatus> excludedStatuses
    );

    // ===== NEW METHODS FOR EVENTSERVICE =====
    Optional<Event> findByInquiryId(Long inquiryId);
    
    List<Event> findByStatusNotIn(List<EventStatus> statuses);
}