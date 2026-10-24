package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
<<<<<<< HEAD
=======
    @Query("SELECT u FROM User u WHERE u.username = :username")
    Optional<User> findByUsername(@Param("username") String username);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
>>>>>>> 9502703f0f87f6cba525531ad2e81db07fd4834a

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