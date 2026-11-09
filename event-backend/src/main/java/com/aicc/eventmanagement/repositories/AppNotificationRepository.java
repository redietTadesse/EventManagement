package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {
    List<AppNotification> findTop30ByUserIdOrderByCreatedAtDescIdDesc(Long userId);
    long countByUserIdAndReadFalse(Long userId);

    @Modifying
    @Query("update AppNotification n set n.read = true where n.userId = :userId and n.read = false")
    void markAllRead(@Param("userId") Long userId);

    @Modifying
    @Query("update AppNotification n set n.read = true where n.userId = :userId and n.id = :id")
    int markRead(@Param("userId") Long userId, @Param("id") Long id);
}
