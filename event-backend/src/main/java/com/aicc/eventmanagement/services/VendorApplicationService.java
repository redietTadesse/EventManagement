package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorApplication;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorApplicationStatus;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.VendorApplyRequest;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorApplicationRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.aicc.eventmanagement.util.CategoryUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VendorApplicationService {

    private final VendorApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final PasswordEncoder passwordEncoder;

    /** Public step: stores the application only. No user or vendor exists yet. */
    @Transactional
    public VendorApplication submit(VendorApplyRequest req) {
        String email = req.getEmail().trim();

        if (Boolean.TRUE.equals(userRepository.existsByEmail(email))) {
            throw new BusinessException("Email already registered", "EMAIL_TAKEN");
        }
        if (applicationRepository.existsByEmailIgnoreCaseAndStatus(email, VendorApplicationStatus.PENDING)) {
            throw new BusinessException(
                    "An application with this email is already awaiting review", "APPLICATION_PENDING");
        }

        VendorApplication application = VendorApplication.builder()
                .companyName(req.getCompanyName().trim())
                .contactPerson(req.getContactPerson().trim())
                .email(email)
                .phone(req.getPhone().trim())
                .serviceCategory(requireKnownCategory(req.getServiceCategory()))
                .description(req.getDescription().trim())
                .website(req.getWebsite() == null || req.getWebsite().isBlank() ? null : req.getWebsite().trim())
                .establishedYear(req.getEstablishedYear())
                .username(uniqueUsernameFromEmail(email))
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .status(VendorApplicationStatus.PENDING)
                .build();

        VendorApplication saved = applicationRepository.save(application);
        log.info("Vendor application {} received for company={}", saved.getId(), saved.getCompanyName());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<VendorApplication> list(VendorApplicationStatus status) {
        return status == null
                ? applicationRepository.findAllByOrderByCreatedAtDesc()
                : applicationRepository.findByStatusOrderByCreatedAtAsc(status);
    }

    @Transactional(readOnly = true)
    public VendorApplication get(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Vendor application", id));
    }

    /** Admin step after the in-person document check: creates the login and the vendor together. */
    @Transactional
    public VendorApplication approve(Long id, String note, String adminUsername) {
        VendorApplication application = get(id);
        requirePending(application);

        if (Boolean.TRUE.equals(userRepository.existsByEmail(application.getEmail()))) {
            throw new BusinessException(
                    "A user account with this email already exists", "EMAIL_TAKEN");
        }

        // The username was reserved at apply time, but a client could have registered it since.
        String username = application.getUsername();
        if (Boolean.TRUE.equals(userRepository.existsByUsername(username))) {
            username = uniqueUsernameFromEmail(application.getEmail());
        }

        User user = User.builder()
                .username(username)
                .email(application.getEmail())
                .passwordHash(application.getPasswordHash())
                .fullName(application.getContactPerson())
                .phone(application.getPhone())
                .role(Role.VENDOR)
                .isActive(true)
                .build();
        userRepository.save(user);

        StringBuilder description = new StringBuilder(
                application.getDescription() == null ? "" : application.getDescription());
        if (application.getWebsite() != null) {
            description.append("\nWebsite: ").append(application.getWebsite());
        }
        if (application.getEstablishedYear() != null) {
            description.append("\nEstablished: ").append(application.getEstablishedYear());
        }

        Vendor vendor = Vendor.builder()
                .userId(user.getId())
                .companyName(application.getCompanyName())
                .serviceCategory(requireKnownCategory(application.getServiceCategory()))
                .description(description.toString())
                .phone(application.getPhone())
                .email(application.getEmail())
                .rating(0.0)
                .isActive(true)
                .build();
        vendor = vendorRepository.save(vendor);

        application.setUsername(username);
        application.setStatus(VendorApplicationStatus.APPROVED);
        application.setVendorId(vendor.getId());
        markReviewed(application, note, adminUsername);

        log.info("Vendor application {} approved by {} -> vendor {} username {}",
                id, adminUsername, vendor.getId(), username);
        return applicationRepository.save(application);
    }

    @Transactional
    public VendorApplication reject(Long id, String note, String adminUsername) {
        VendorApplication application = get(id);
        requirePending(application);

        application.setStatus(VendorApplicationStatus.REJECTED);
        markReviewed(application, note, adminUsername);

        log.info("Vendor application {} rejected by {}", id, adminUsername);
        return applicationRepository.save(application);
    }

    private void requirePending(VendorApplication application) {
        if (application.getStatus() != VendorApplicationStatus.PENDING) {
            throw new BusinessException(
                    "This application has already been " + application.getStatus().name().toLowerCase(),
                    "APPLICATION_ALREADY_REVIEWED");
        }
    }

    private void markReviewed(VendorApplication application, String note, String adminUsername) {
        application.setReviewNote(note == null || note.isBlank() ? null : note.trim());
        application.setReviewedAt(LocalDateTime.now());
        application.setReviewedBy(adminUsername == null ? null
                : userRepository.findByUsername(adminUsername).map(User::getId).orElse(null));
    }

    private String requireKnownCategory(String category) {
        String canonical = CategoryUtils.canonicalize(category);
        if (!CategoryUtils.isKnownCategory(canonical)) {
            throw new BusinessException("Unsupported vendor service category", "VENDOR_CATEGORY_MISMATCH");
        }
        return canonical;
    }

    private String uniqueUsernameFromEmail(String email) {
        int at = email.indexOf('@');
        String local = (at > 0 ? email.substring(0, at) : email).replaceAll("[^a-zA-Z0-9._-]", "");
        if (local.length() < 3) {
            local = "vendor";
        }
        if (local.length() > 40) {
            local = local.substring(0, 40);
        }
        String username = local;
        int n = 1;
        while (Boolean.TRUE.equals(userRepository.existsByUsername(username))
                || applicationRepository.existsByUsernameAndStatus(username, VendorApplicationStatus.PENDING)) {
            username = local + n++;
        }
        return username;
    }
}
