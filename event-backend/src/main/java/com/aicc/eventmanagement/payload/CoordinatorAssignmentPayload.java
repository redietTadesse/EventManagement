package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.CoordinatorAssignmentHistory;
import com.aicc.eventmanagement.entities.User;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public final class CoordinatorAssignmentPayload {
    private CoordinatorAssignmentPayload() {}
    public record Person(Long id, String name, boolean active) {
        public static Person from(User user) {
            if (user == null) return null;
            return new Person(user.getId(), user.getFullName() == null ? user.getUsername() : user.getFullName(),
                    user.isActive());
        }
    }
    public record Assign(@NotNull Long coordinatorId, @NotNull @Min(0) Long expectedVersion,
                         @NotBlank @Size(max = 1000) String reason) {}
    public record Change(Long id, Long previousCoordinatorId, String previousCoordinatorName,
                         Long coordinatorId, String coordinatorName, Long changedById, String changedByName,
                         String reason, LocalDateTime changedAt) {
        public static Change from(CoordinatorAssignmentHistory item) {
            return new Change(item.getId(), item.getPreviousCoordinatorId(), item.getPreviousCoordinatorName(),
                    item.getCoordinatorId(), item.getCoordinatorName(), item.getChangedById(),
                    item.getChangedByName(), item.getReason(), item.getChangedAt());
        }
    }
    public record Ownership(Person coordinator, long version, List<Change> history) {}
    public record Workload(Person coordinator, long inquiries, long events) {}
}
