package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Checklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChecklistRepository extends JpaRepository<Checklist, Long> {
    List<Checklist> findByEventId(Long eventId);

    @Query("SELECT DISTINCT c FROM Checklist c LEFT JOIN FETCH c.dependencies "
            + "WHERE c.event.id = :eventId ORDER BY c.id")
    List<Checklist> findByEventIdWithDependencies(@Param("eventId") Long eventId);

    @Query("SELECT DISTINCT c FROM Checklist c LEFT JOIN FETCH c.dependencies WHERE c.id = :id")
    java.util.Optional<Checklist> findByIdWithDependencies(@Param("id") Long id);
    
    List<Checklist> findByEventIdAndIsComplete(Long eventId, boolean isComplete);
}
