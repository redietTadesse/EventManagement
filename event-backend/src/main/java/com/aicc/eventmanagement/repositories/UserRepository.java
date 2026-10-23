package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // ===== EXISTING METHODS (keep these) =====
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    // ... any other existing methods ...

    // ===== ADD THIS METHOD =====
    /**
     * Count users by their active status.
     * Used by DashboardService for statistics.
     */
    long countByIsActive(boolean isActive);
}