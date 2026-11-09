package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.EventIssue;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface EventIssueRepository extends JpaRepository<EventIssue, Long> {
    List<EventIssue> findByEventIdOrderByCreatedAtDesc(Long eventId);

    @Query("select distinct i from EventIssue i join fetch i.event where i.status != :resolvedStatus order by i.dueDate asc, i.createdAt asc")
    List<EventIssue> findByStatusNotOrderByDueDateAscCreatedAtEager(@Param("resolvedStatus") EventIssue.Status resolvedStatus);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from EventIssue i where i.id = :id")
    Optional<EventIssue> findForUpdate(@Param("id") Long id);
}
