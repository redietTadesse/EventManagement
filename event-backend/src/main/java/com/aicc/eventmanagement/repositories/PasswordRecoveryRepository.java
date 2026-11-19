package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.PasswordRecovery;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PasswordRecoveryRepository extends JpaRepository<PasswordRecovery, Long> {
    Optional<PasswordRecovery> findByTokenHash(String tokenHash);
    @org.springframework.data.jpa.repository.Query("select p.userId from PasswordRecovery p where p.tokenHash = :hash")
    Optional<Long> findUserIdByTokenHash(@org.springframework.data.repository.query.Param("hash") String hash);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from PasswordRecovery p where p.userId = :id")
    Optional<PasswordRecovery> findForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
