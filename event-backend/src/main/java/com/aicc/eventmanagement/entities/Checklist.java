package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.aicc.eventmanagement.enums.Role;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "checklists", uniqueConstraints = {
        @UniqueConstraint(name = "uk_checklists_event_template", columnNames = {"event_id", "template_key"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Checklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @NotBlank
    @Size(max = 255)
    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "is_complete")
    @Builder.Default
    private boolean isComplete = false;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "template_key", length = 100)
    private String templateKey;

    @Column(name = "offset_days")
    private Integer offsetDays;

    @Column(name = "due_date_overridden", nullable = false)
    @Builder.Default
    private boolean dueDateOverridden = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_role", nullable = false, length = 20)
    @Builder.Default
    private Role ownerRole = Role.COORDINATOR;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "checklist_dependencies",
            joinColumns = @JoinColumn(name = "checklist_id"),
            inverseJoinColumns = @JoinColumn(name = "prerequisite_id"),
            uniqueConstraints = @UniqueConstraint(name = "uk_checklist_dependency",
                    columnNames = {"checklist_id", "prerequisite_id"}))
    @Builder.Default
    private Set<Checklist> dependencies = new LinkedHashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
