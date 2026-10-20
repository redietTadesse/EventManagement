package com.aicc.eventmanagement.entities;

import com.aicc.eventmanagement.enums.EventStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "inquiry_id", nullable = false)
    private Inquiry inquiry;

    @NotBlank
    @Size(max = 255)
    @Column(nullable = false)
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status;

    private String venue;

    @Column(name = "venue_id")
    private Long venueId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "venue_details", columnDefinition = "JSON")
    private String venueDetails;

    @Column(name = "unfilled_categories")
    private String unfilledCategories;

    @Column(name = "required_categories", columnDefinition = "TEXT")
    private String requiredCategories;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Checklist> checklist = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void addChecklistItem(Checklist item) {
        checklist.add(item);
        item.setEvent(this);
    }

    public void removeChecklistItem(Checklist item) {
        checklist.remove(item);
        item.setEvent(null);
    }
}