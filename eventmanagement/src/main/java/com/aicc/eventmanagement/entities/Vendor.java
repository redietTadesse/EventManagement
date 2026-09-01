package com.aicc.eventmanagement.entities;

import com.aicc.eventmanagement.enums.Role;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
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

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phone;

    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must not exceed 5")
    private Integer rating;

    @Column(name = "is_active")
    private boolean isActive = true;

    @OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<VendorBookedDate> bookedDates = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

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