package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    List<Inquiry> findByStatus(EventStatus status);

    List<Inquiry> findByClientId(Long clientId);

    List<Inquiry> findByClientIdAndStatus(Long clientId, EventStatus status);

    @Query("SELECT i FROM Inquiry i WHERE i.eventDate BETWEEN :start AND :end AND i.status = :status")
    List<Inquiry> findUpcomingByStatus(@Param("start") LocalDate start,
                                       @Param("end") LocalDate end,
                                       @Param("status") EventStatus status);

    @Query("SELECT i FROM Inquiry i WHERE i.status IN :statuses")
    List<Inquiry> findByStatusIn(@Param("statuses") List<EventStatus> statuses);

    boolean existsByClientIdAndStatus(Long clientId, EventStatus status);

    @Query("SELECT i FROM Inquiry i WHERE i.eventType LIKE %:eventType%")
    List<Inquiry> findByEventTypeContaining(@Param("eventType") String eventType);

    @Query("SELECT i FROM Inquiry i WHERE i.clientName LIKE %:clientName%")
    List<Inquiry> findByClientNameContaining(@Param("clientName") String clientName);

    @Query("SELECT i FROM Inquiry i WHERE i.eventDate BETWEEN :startDate AND :endDate")
    List<Inquiry> findByEventDateBetween(@Param("startDate") LocalDate startDate,
                                         @Param("endDate") LocalDate endDate);

    @Query("SELECT i FROM Inquiry i WHERE i.expectedAttendees >= :minAttendees")
    List<Inquiry> findByExpectedAttendeesGreaterThanEqual(@Param("minAttendees") Integer minAttendees);

    @Query("SELECT i FROM Inquiry i WHERE i.expectedAttendees <= :maxAttendees")
    List<Inquiry> findByExpectedAttendeesLessThanEqual(@Param("maxAttendees") Integer maxAttendees);

    // ----------------------------------------------------------------
    // Advanced filter query (findByFilters)
    // ----------------------------------------------------------------
    @Query("SELECT i FROM Inquiry i WHERE " +
            "(:status IS NULL OR i.status = :status) AND " +
            "(:clientId IS NULL OR i.clientId = :clientId) AND " +
            "(:eventType IS NULL OR i.eventType LIKE %:eventType%) AND " +
            "(:clientName IS NULL OR i.clientName LIKE %:clientName%) AND " +
            "(:startDate IS NULL OR i.eventDate >= :startDate) AND " +
            "(:endDate IS NULL OR i.eventDate <= :endDate)")
    List<Inquiry> findByFilters(
            @Param("status") EventStatus status,
            @Param("clientId") Long clientId,
            @Param("eventType") String eventType,
            @Param("clientName") String clientName,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // ----------------------------------------------------------------
    // Scheduler query (findStaleByStatus) — kept as a SEPARATE method
    // ----------------------------------------------------------------
    @Query("""
           SELECT i FROM Inquiry i
           WHERE i.status = :status
             AND i.updatedAt < :cutoff
           """)
    List<Inquiry> findStaleByStatus(@Param("status") EventStatus status,
                                    @Param("cutoff") LocalDateTime cutoff);
}