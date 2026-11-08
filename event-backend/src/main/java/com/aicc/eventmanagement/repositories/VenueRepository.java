package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Venue;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Venue> findByNameIgnoreCase(String name);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT venue FROM Venue venue WHERE venue.id = :id")
    Optional<Venue> findByIdForUpdate(@Param("id") Long id);
}
