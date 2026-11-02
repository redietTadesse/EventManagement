package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.VenueUnavailableDate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface VenueUnavailableDateRepository extends JpaRepository<VenueUnavailableDate, Long> {

    boolean existsByVenueIdAndUnavailableDate(Long venueId, LocalDate unavailableDate);

    boolean existsByVenueId(Long venueId);

    boolean existsByVenueIdAndUnavailableDateBetween(Long venueId, LocalDate start, LocalDate end);

    List<VenueUnavailableDate> findByVenueIdOrderByUnavailableDateAsc(Long venueId);

    Optional<VenueUnavailableDate> findByIdAndVenueId(Long id, Long venueId);

}
