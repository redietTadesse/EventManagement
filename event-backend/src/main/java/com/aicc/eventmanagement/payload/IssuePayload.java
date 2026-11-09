package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.EventIssue;
import com.aicc.eventmanagement.entities.User;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class IssuePayload {
    private IssuePayload() {}
    public record Create(@NotBlank @Size(max = 200) String title,
                         @NotBlank @Size(max = 4000) String description,
                         @NotNull EventIssue.Priority priority,
                         Long assignmentId, Long checklistId, Long responsibleUserId, LocalDate dueDate) {}
    public record Edit(@NotNull Long version, @NotNull EventIssue.Priority priority,
                       @NotNull Long responsibleUserId, LocalDate dueDate,
                       @NotNull EventIssue.Status status, @Size(max = 4000) String resolutionNote) {}
    public record Note(@NotBlank @Size(max = 4000) String note) {}
    public record Person(Long id, String name, String role) {
        public static Person from(User user) {
            return new Person(user.getId(), user.getFullName() == null ? user.getUsername() : user.getFullName(),
                    user.getRole().name());
        }
    }
    public record Update(Long id, Person author, String note, LocalDateTime createdAt) {}
    public record View(Long id, long version, Long eventId, String eventName, String title,
                       String description, EventIssue.Priority priority, EventIssue.Status status,
                       Long assignmentId, String vendorName, Long checklistId, String taskName,
                       Person reportedBy, Person responsible, LocalDate dueDate, boolean overdue,
                       String resolutionNote, Person resolvedBy, LocalDateTime resolvedAt,
                       LocalDateTime createdAt, List<Update> updates) {
        public static View from(EventIssue issue) {
            return new View(issue.getId(), issue.getVersion(), issue.getEvent().getId(), issue.getEvent().getName(),
                    issue.getTitle(), issue.getDescription(), issue.getPriority(), issue.getStatus(),
                    issue.getAssignment() == null ? null : issue.getAssignment().getId(),
                    issue.getAssignment() == null ? null : issue.getAssignment().getVendorName(),
                    issue.getChecklist() == null ? null : issue.getChecklist().getId(),
                    issue.getChecklist() == null ? null : issue.getChecklist().getItemName(),
                    Person.from(issue.getReportedBy()), Person.from(issue.getResponsible()), issue.getDueDate(),
                    issue.getStatus() != EventIssue.Status.RESOLVED && issue.getDueDate() != null
                            && issue.getDueDate().isBefore(LocalDate.now()),
                    issue.getResolutionNote(), issue.getResolvedBy() == null ? null : Person.from(issue.getResolvedBy()),
                    issue.getResolvedAt(), issue.getCreatedAt(),
                    issue.getUpdates().stream().map(update -> new Update(update.getId(), Person.from(update.getAuthor()),
                            update.getNote(), update.getCreatedAt())).toList());
        }
    }
}
