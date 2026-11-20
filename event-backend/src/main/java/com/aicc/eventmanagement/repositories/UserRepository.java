package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.time.Instant;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.id = :id")
    Optional<User> findForPasswordUpdate(@org.springframework.data.repository.query.Param("id") Long id);

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByGoogleSubject(String googleSubject);

    @Modifying
    @Transactional
    @Query("update User u set u.faydaSandboxVerifiedAt = :verifiedAt where u.id = :id and u.isActive = true and u.role = :role")
    int recordFaydaSandboxVerification(@Param("id") Long id, @Param("verifiedAt") Instant verifiedAt, @Param("role") Role role);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    long countByIsActive(boolean isActive);

    long countByRole(Role role);

    List<User> findByRoleOrderByUsernameAsc(Role role);

    List<User> findByRoleAndIsActiveTrue(Role role);
}
