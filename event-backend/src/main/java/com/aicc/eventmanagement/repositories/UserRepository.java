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
    @Query("SELECT u FROM User u WHERE u.username = :username")
    Optional<User> findByUsername(@Param("username") String username);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);

    long countByRole(Role role);
    long countByIsActive(boolean isActive);
}