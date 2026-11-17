package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
public class AppNotification {
    public enum Destination {
        CLIENT_INQUIRY("/client/inquiries/"), COORDINATOR_INQUIRY("/coordinator/inquiries/"),
        VENDOR_ASSIGNMENT("/vendor/assignments/"), CLIENT_EVENT("/client/events/"),
        COORDINATOR_EVENT("/coordinator/events/");

        private final String prefix;

        Destination(String prefix) { this.prefix = prefix; }

        public String path(Long id) { return prefix + id; }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read")
    private boolean read;

    @Column(name = "type", nullable = false, length = 50)
    private String destination;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
