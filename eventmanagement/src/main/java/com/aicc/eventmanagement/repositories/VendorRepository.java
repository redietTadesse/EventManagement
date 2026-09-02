package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, Long> {

    Optional<Vendor> findByUserId(Long userId);

    List<Vendor> findByServiceCategory(String serviceCategory);

    List<Vendor> findByIsActive(boolean isActive);

    @Query("SELECT v FROM Vendor v WHERE v.serviceCategory = :category AND v.isActive = true")
    List<Vendor> findActiveByCategory(@Param("category") String category);

    @Query("SELECT v FROM Vendor v WHERE v.rating >= :minRating AND v.isActive = true")
    List<Vendor> findActiveByMinRating(@Param("minRating") Integer minRating);

    @Query("SELECT v FROM Vendor v WHERE v.companyName LIKE %:name%")
    List<Vendor> findByCompanyNameContaining(@Param("name") String name);

    @Query("SELECT COUNT(v) FROM Vendor v WHERE v.serviceCategory = :category AND v.isActive = true")
    long countActiveByCategory(@Param("category") String category);

    boolean existsByUserId(Long userId);
}