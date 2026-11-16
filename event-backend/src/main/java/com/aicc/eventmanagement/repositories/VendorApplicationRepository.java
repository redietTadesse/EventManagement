package com.aicc.eventmanagement.repositories;

import com.aicc.eventmanagement.entities.VendorApplication;
import com.aicc.eventmanagement.enums.VendorApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VendorApplicationRepository extends JpaRepository<VendorApplication, Long> {

    List<VendorApplication> findByStatusOrderByCreatedAtAsc(VendorApplicationStatus status);

    List<VendorApplication> findAllByOrderByCreatedAtDesc();

    boolean existsByEmailIgnoreCaseAndStatus(String email, VendorApplicationStatus status);

    boolean existsByUsernameAndStatus(String username, VendorApplicationStatus status);

    Optional<VendorApplication> findFirstByUsernameAndStatus(String username, VendorApplicationStatus status);
}