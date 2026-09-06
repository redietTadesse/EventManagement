package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
                                     @Param("start") java.time.LocalDate start,
                                     @Param("end") java.time.LocalDate end);
}