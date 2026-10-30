package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.payload.DashboardUpcomingEvent;
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

    @Query("""
           SELECT new com.aicc.eventmanagement.payload.DashboardUpcomingEvent(
               e.id, e.name, e.status, i.eventDate, i.clientName, e.venue, i.expectedAttendees)
           FROM Event e JOIN e.inquiry i
           WHERE i.eventDate BETWEEN :start AND :end
             AND e.status NOT IN :excludedStatuses
           ORDER BY i.eventDate ASC
           """)
    List<DashboardUpcomingEvent> findDashboardUpcomingEvents(
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("excludedStatuses") List<EventStatus> excludedStatuses);

    Optional<Event> findByInquiryId(Long inquiryId);

    List<Event> findByInquiry_ClientId(Long clientId);

    List<Event> findByStatusNotIn(List<EventStatus> statuses);

    @Query("SELECT e FROM Event e WHERE e.status NOT IN :statuses AND e.inquiry.eventDate >= CURRENT_DATE")
    List<Event> findAllActiveEvents(@Param("statuses") List<EventStatus> statuses);

    @Query("SELECT e FROM Event e WHERE e.status IN :statuses")
    List<Event> findByStatusIn(@Param("statuses") List<EventStatus> statuses);

    @Query("SELECT e FROM Event e WHERE e.status = :status AND e.inquiry.eventDate BETWEEN :start AND :end")
    List<Event> findUpcomingByStatus(@Param("status") EventStatus status,
                                     @Param("start") LocalDate start,
                                     @Param("end") LocalDate end);

    @Query("""
           SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END
           FROM Event e
           WHERE e.venueId = :venueId
             AND e.inquiry.eventDate = :date
             AND e.status NOT IN :excludedStatuses
           """)
    boolean isVenueBookedOn(@Param("venueId") Long venueId,
                            @Param("date") LocalDate date,
                            @Param("excludedStatuses") List<EventStatus> excludedStatuses);

    @Query("SELECT COUNT(e) FROM Event e " +
            "WHERE e.venueId = :venueId " +
            "AND e.inquiry.eventDate BETWEEN :startDate AND :endDate " +
            "AND e.status NOT IN :excludedStatuses " +
            "AND e.id <> :excludedEventId")
    long countVenueEventsInRangeExcludingEvent(
            @Param("venueId") Long venueId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludedStatuses") List<EventStatus> excludedStatuses,
            @Param("excludedEventId") Long excludedEventId);

    @Query("""
           SELECT e FROM Event e
           WHERE e.status = :status
             AND e.inquiry.eventDate < :today
           """)
    List<Event> findPastEventsByStatus(@Param("status") EventStatus status,
                                       @Param("today") LocalDate today);

    @Query("""
           SELECT DISTINCT e.venueId
           FROM Event e
           WHERE e.inquiry.eventDate = :date
             AND e.venueId IS NOT NULL
             AND e.status NOT IN :excludedStatuses
           """)
    List<Long> findBookedVenueIdsOn(@Param("date") LocalDate date,
                                    @Param("excludedStatuses") List<EventStatus> excludedStatuses);

    @Query("""
           SELECT e FROM Event e
           WHERE e.venueId IS NOT NULL
             AND e.inquiry.eventDate BETWEEN :start AND :end
             AND e.status NOT IN :excludedStatuses
           """)
    List<Event> findVenueBookedEventsInRange(@Param("start") LocalDate start,
                                             @Param("end") LocalDate end,
                                             @Param("excludedStatuses") List<EventStatus> excludedStatuses);
}
