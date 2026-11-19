package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.AvailabilityWatch;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AvailabilityWatchRepository extends JpaRepository<AvailabilityWatch,Long> {
    Optional<AvailabilityWatch> findByInquiryId(Long inquiryId);
    @Query("select w.inquiryId from AvailabilityWatch w where w.id = :id")
    Optional<Long> inquiryIdForWatch(@Param("id") Long id);
    @Query("select w.id from AvailabilityWatch w where w.status = :status and w.nextCheckAt <= :now order by w.nextCheckAt, w.id")
    List<Long> due(@Param("status") AvailabilityWatch.Status status, @Param("now") Instant now, Pageable page);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select w from AvailabilityWatch w where w.id = :id")
    Optional<AvailabilityWatch> findForUpdate(@Param("id") Long id);
}
