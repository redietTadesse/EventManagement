package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByStatus(EventStatus status);

    List<Event> findByInquiry_ClientId(Long clientId);

    Optional<Event> findByInquiryId(Long inquiryId);

    @Query("SELECT e FROM Event e WHERE e.status NOT IN :statuses")
    List<Event> findByStatusNotIn(@Param("statuses") List<EventStatus> statuses);

    @Query("SELECT e FROM Event e WHERE e.status IN :statuses")
    List<Event> findByStatusIn(@Param("statuses") List<EventStatus> statuses);

    @Query("SELECT e FROM Event e WHERE e.status = :status AND e.inquiry.eventDate BETWEEN :start AND :end")
    List<Event> findUpcomingByStatus(@Param("status") EventStatus status,
                                     @Param("start") LocalDate start,
                                     @Param("end") LocalDate end);

    // --- Venue availability (task 2) ---
    @Query("""
           SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END
           FROM Event e
           WHERE e.venueId = :venueId
             AND e.inquiry.eventDate = :date
             AND e.status NOT IN :deadStatuses
           """)
    boolean isVenueBookedOn(@Param("venueId") Long venueId,
                            @Param("date") LocalDate date,
                            @Param("deadStatuses") List<EventStatus> deadStatuses);

    @Query("""
           SELECT DISTINCT e.venueId
           FROM Event e
           WHERE e.inquiry.eventDate = :date
             AND e.venueId IS NOT NULL
             AND e.status NOT IN :deadStatuses
           """)
    List<Long> findBookedVenueIdsOn(@Param("date") LocalDate date,
                                    @Param("deadStatuses") List<EventStatus> deadStatuses);
}