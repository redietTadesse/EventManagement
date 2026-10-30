package com.aicc.eventmanagement.entities;

import com.aicc.eventmanagement.enums.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "vendors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @NotBlank(message = "Company name is required")
    @Size(max = 255, message = "Company name must not exceed 255 characters")
    @Column(name = "company_name", nullable = false)
    private String companyName;

    @NotBlank(message = "Service category is required")
    @Size(max = 100, message = "Service category must not exceed 100 characters")
    @Column(name = "service_category", nullable = false)
    private String serviceCategory;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Transient
    private LocalDate insuranceExpiryDate;

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phone;

    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @DecimalMin(value = "0.0", message = "Rating must not be below 0")
    @DecimalMax(value = "5.0", message = "Rating must not exceed 5")
    @JdbcTypeCode(SqlTypes.DECIMAL)
    @Column(precision = 3, scale = 1)
    private Double rating;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @JsonIgnore
    @OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<VendorBookedDate> bookedDates = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PostLoad
    private void loadInsuranceExpiryDate() {
        String marker = "\n[insurance-expiry:";
        if (description == null) return;
        int markerIndex = description.lastIndexOf(marker);
        if (markerIndex < 0 || !description.endsWith("]")) return;
        try {
            insuranceExpiryDate = LocalDate.parse(description.substring(markerIndex + marker.length(), description.length() - 1));
            description = description.substring(0, markerIndex);
        } catch (RuntimeException ignored) {
            insuranceExpiryDate = null;
        }
    }

    @PrePersist
    @PreUpdate
    private void storeInsuranceExpiryDate() {
        if (description == null) description = "";
        String marker = "\n[insurance-expiry:";
        int markerIndex = description.lastIndexOf(marker);
        if (markerIndex >= 0) description = description.substring(0, markerIndex);
        if (insuranceExpiryDate != null) description += marker + insuranceExpiryDate + "]";
    }

    @PostPersist
    @PostUpdate
    private void cleanDescriptionMetadata() {
        String marker = "\n[insurance-expiry:";
        if (description != null) {
            int markerIndex = description.lastIndexOf(marker);
            if (markerIndex >= 0) description = description.substring(0, markerIndex);
        }
    }

    // Helper method to add booked dates
    public void addBookedDate(VendorBookedDate bookedDate) {
        bookedDates.add(bookedDate);
        bookedDate.setVendor(this);
    }

    public void removeBookedDate(VendorBookedDate bookedDate) {
        bookedDates.remove(bookedDate);
        bookedDate.setVendor(null);
    }
}
