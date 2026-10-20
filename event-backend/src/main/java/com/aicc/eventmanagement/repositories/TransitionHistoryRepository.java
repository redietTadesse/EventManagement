package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.TransitionHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransitionHistoryRepository extends JpaRepository<TransitionHistory, Long> {

    List<TransitionHistory> findByReferenceTypeAndReferenceIdOrderByOccurredAtDesc(
            String referenceType, String referenceId);

    List<TransitionHistory> findAllByOrderByOccurredAtDesc(Pageable pageable);
}