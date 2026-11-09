package com.aicc.eventmanagement.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "issue_updates")
@Getter @Setter @NoArgsConstructor
public class IssueUpdate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "issue_id", nullable = false)
    private EventIssue issue;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;
    @Column(nullable = false, length = 4000)
    private String note;
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
