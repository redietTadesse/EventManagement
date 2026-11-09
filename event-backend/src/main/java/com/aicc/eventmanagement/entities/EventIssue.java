package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "event_issues")
@Getter @Setter @NoArgsConstructor
public class EventIssue {
    public enum Status { OPEN, IN_PROGRESS, RESOLVED }
    public enum Priority { LOW, MEDIUM, HIGH, URGENT }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    private long version;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.SET_NULL)
    private VendorAssignment assignment;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.SET_NULL)
    private Checklist checklist;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(nullable = false, length = 4000)
    private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Priority priority;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Status status = Status.OPEN;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reported_by", nullable = false)
    private User reportedBy;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responsible_user_id", nullable = false)
    private User responsible;
    private LocalDate dueDate;
    @Column(length = 4000)
    private String resolutionNote;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;
    private LocalDateTime resolvedAt;
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @OneToMany(mappedBy = "issue", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<IssueUpdate> updates = new ArrayList<>();
}
