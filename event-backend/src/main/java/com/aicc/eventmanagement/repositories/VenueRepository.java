package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Venue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Venue> findByNameIgnoreCase(String name);
}