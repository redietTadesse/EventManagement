package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Checklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChecklistRepository extends JpaRepository<Checklist, Long> {
    List<Checklist> findByEventId(Long eventId);
    
    List<Checklist> findByEventIdAndIsComplete(Long eventId, boolean isComplete);
}