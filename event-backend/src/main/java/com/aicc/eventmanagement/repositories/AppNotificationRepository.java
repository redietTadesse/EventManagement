package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {
    Page<AppNotification> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);
    Optional<AppNotification> findByIdAndUserId(Long id, Long userId);
    long countByUserIdAndReadFalse(Long userId);

    @Modifying
    @Query("update AppNotification n set n.read = true where n.userId = :userId and n.read = false")
    void markAllRead(@Param("userId") Long userId);
}
