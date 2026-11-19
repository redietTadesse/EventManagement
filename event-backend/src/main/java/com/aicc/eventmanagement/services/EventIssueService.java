package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.*;
import com.aicc.eventmanagement.enums.*;
import com.aicc.eventmanagement.exceptions.*;
import com.aicc.eventmanagement.payload.IssuePayload.*;
import com.aicc.eventmanagement.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class EventIssueService {
    private final EventIssueRepository issues;
    private final EventRepository events;
    private final VendorAssignmentRepository assignments;
    private final ChecklistRepository checklists;
    private final UserRepository users;
    private final RecordAccessService access;
    private final NotificationService notifications;

    private User actor(String username) {
        return users.findByUsername(username).orElseThrow(() -> new AccessDeniedException("User not found"));
    }

    private boolean staff(User user) {
        return user.getRole() == Role.COORDINATOR || user.getRole() == Role.ADMIN;
    }

    private boolean visible(EventIssue issue, User user) {
        return staff(user) || issue.getResponsible().getId().equals(user.getId())
                || issue.getReportedBy().getId().equals(user.getId())
                || issue.getAssignment() != null && issue.getAssignment().getVendor() != null
                && user.getId().equals(issue.getAssignment().getVendor().getUserId());
    }

    private List<User> responsibleUsers(Long eventId) {
        Map<Long, User> choices = new LinkedHashMap<>();
        users.findByRoleOrderByUsernameAsc(Role.COORDINATOR).stream().filter(User::isActive)
                .forEach(user -> choices.put(user.getId(), user));
        users.findByRoleOrderByUsernameAsc(Role.ADMIN).stream().filter(User::isActive)
                .forEach(user -> choices.put(user.getId(), user));
        assignments.findByEventId(eventId).stream()
                .filter(assignment -> assignment.getStatus() == VendorAssignmentStatus.ACCEPTED)
                .map(VendorAssignment::getVendor).filter(Objects::nonNull)
                .map(Vendor::getUserId).filter(Objects::nonNull)
                .map(users::findById).flatMap(Optional::stream).filter(User::isActive)
                .forEach(user -> choices.put(user.getId(), user));
        return new ArrayList<>(choices.values());
    }

    private User responsible(Long eventId, Long userId) {
        return responsibleUsers(eventId).stream().filter(user -> user.getId().equals(userId)).findFirst()
                .orElseThrow(() -> new BusinessException("Choose an active coordinator or an accepted event vendor",
                        "INVALID_RESPONSIBLE_USER"));
    }

    @Transactional(readOnly = true)
    public List<Person> people(Long eventId, String username) {
        access.requireEventAccess(eventId, username);
        return responsibleUsers(eventId).stream().map(Person::from).toList();
    }

    @Transactional(readOnly = true)
    public List<View> list(Long eventId, String username) {
        access.requireEventAccess(eventId, username);
        User user = actor(username);
        return issues.findByEventIdOrderByCreatedAtDesc(eventId).stream()
                .filter(issue -> visible(issue, user)).map(View::from).toList();
    }

    @Transactional(readOnly = true)
    public List<View> outstanding() {
        return issues.findByStatusNotOrderByDueDateAscCreatedAtEager(EventIssue.Status.RESOLVED)
                .stream().map(View::from).toList();
    }

    public View create(Long eventId, Create request, String username) {
        User user = actor(username);
        Event event = events.findById(eventId).orElseThrow(() -> new EntityNotFoundException("Event", eventId));
        if (List.of(EventStatus.CANCELLED, EventStatus.CLOSED, EventStatus.COMPLETED).contains(event.getStatus())) {
            throw new BusinessException("Issues can only be reported for active events", "EVENT_CLOSED");
        }
        access.requireEventAccess(eventId, username);
        EventIssue issue = new EventIssue();
        issue.setEvent(event);
        issue.setTitle(request.title().trim());
        issue.setDescription(request.description().trim());
        issue.setPriority(request.priority());
        issue.setReportedBy(user);
        if (request.assignmentId() != null) {
            VendorAssignment assignment = assignments.findById(request.assignmentId())
                    .orElseThrow(() -> new EntityNotFoundException("Assignment", request.assignmentId()));
            if (!assignment.getEvent().getId().equals(eventId)) {
                throw new BusinessException("The assignment must belong to this event", "INVALID_ASSIGNMENT");
            }
            access.requireAssignmentAccess(assignment.getId(), username);
            if (!staff(user) && assignment.getStatus() != VendorAssignmentStatus.ACCEPTED) {
                throw new BusinessException("Report issues against an accepted assignment", "INVALID_ASSIGNMENT");
            }
            issue.setAssignment(assignment);
        } else if (!staff(user)) {
            throw new BusinessException("Select your event assignment", "ASSIGNMENT_REQUIRED");
        }
        if (request.checklistId() != null) {
            if (!staff(user)) throw new AccessDeniedException("Only staff can link preparation tasks");
            Checklist task = checklists.findById(request.checklistId())
                    .orElseThrow(() -> new EntityNotFoundException("Task", request.checklistId()));
            if (!task.getEvent().getId().equals(eventId)) {
                throw new BusinessException("The task must belong to this event", "INVALID_TASK");
            }
            issue.setChecklist(task);
        }
        User owner = user;
        if (staff(user) && request.responsibleUserId() != null) {
            owner = responsible(eventId, request.responsibleUserId());
        } else if (!staff(user)) {
            owner = event.getInquiry().getCoordinator();
            if (owner == null || !owner.isActive()) {
                throw new BusinessException("Ask staff to assign an active lead coordinator to this event first",
                        "NO_COORDINATOR");
            }
        }
        issue.setResponsible(owner);
        // Staff set deadlines and responsibility after reviewing a vendor's report.
        if (staff(user)) issue.setDueDate(request.dueDate());
        addUpdate(issue, user, "Reported issue");
        issues.saveAndFlush(issue);
        Set<Long> recipients = new LinkedHashSet<>();
        recipients.add(owner.getId());
        if (event.getInquiry().getCoordinator() != null) recipients.add(event.getInquiry().getCoordinator().getId());
        notifyPeople(issue, user, recipients, "Event issue reported", issue.getDescription());
        return View.from(issue);
    }

    public View edit(Long id, Edit request, String username) {
        EventIssue issue = locked(id);
        User user = actor(username);
        if (!staff(user)) throw new AccessDeniedException("Only coordinators can manage issues");
        if (issue.getVersion() != request.version()) {
            throw new BusinessException("This issue changed. Refresh it before saving.", "STALE_ISSUE");
        }
        if (issue.getStatus() == EventIssue.Status.RESOLVED) {
            throw new BusinessException("This issue has already been resolved", "ISSUE_RESOLVED");
        }
        if (request.status() != issue.getStatus()
                && !(issue.getStatus() == EventIssue.Status.OPEN && request.status() == EventIssue.Status.IN_PROGRESS)
                && !(issue.getStatus() == EventIssue.Status.IN_PROGRESS && request.status() == EventIssue.Status.RESOLVED)) {
            throw new BusinessException("Move the issue from Open to In progress before resolving it",
                    "INVALID_ISSUE_TRANSITION");
        }
        if (request.status() == EventIssue.Status.RESOLVED
                && (request.resolutionNote() == null || request.resolutionNote().isBlank())) {
            throw new BusinessException("Describe how the issue was resolved", "RESOLUTION_REQUIRED");
        }
        Long previousOwner = issue.getResponsible().getId();
        issue.setResponsible(responsible(issue.getEvent().getId(), request.responsibleUserId()));
        issue.setPriority(request.priority());
        issue.setDueDate(request.dueDate());
        issue.setStatus(request.status());
        if (request.status() == EventIssue.Status.RESOLVED) {
            issue.setResolutionNote(request.resolutionNote().trim());
            issue.setResolvedBy(user);
            issue.setResolvedAt(LocalDateTime.now());
        }
        addUpdate(issue, user, "Status " + issue.getStatus() + ". Priority " + issue.getPriority()
                + ". Responsible " + issue.getResponsible().getUsername() + ". Due " + issue.getDueDate());
        issues.saveAndFlush(issue);
        if (issue.getStatus() == EventIssue.Status.RESOLVED) {
            Set<Long> recipients = new LinkedHashSet<>();
            recipients.add(issue.getReportedBy().getId());
            recipients.add(issue.getResponsible().getId());
            if (issue.getAssignment() != null && issue.getAssignment().getVendor() != null)
                recipients.add(issue.getAssignment().getVendor().getUserId());
            if (issue.getEvent().getInquiry().getCoordinator() != null)
                recipients.add(issue.getEvent().getInquiry().getCoordinator().getId());
            notifyPeople(issue, user, recipients, "Event issue resolved", issue.getResolutionNote());
        } else if (!previousOwner.equals(issue.getResponsible().getId())) {
            notifyPeople(issue, user, Set.of(issue.getResponsible().getId()),
                    "An event issue needs your attention", "You are responsible for following up this issue.");
        }
        return View.from(issue);
    }

    private void notifyPeople(EventIssue issue, User actor, Set<Long> recipients, String title, String detail) {
        for (Long recipientId : recipients) {
            if (recipientId == null || recipientId.equals(actor.getId())) continue;
            User recipient = users.findById(recipientId).orElse(null);
            if (recipient == null) continue;
            AppNotification.Destination destination;
            Long reference = issue.getEvent().getId();
            if (recipient.getRole() == Role.VENDOR) {
                // A vendor may only be linked to their own assignment, including when staff
                // assigned responsibility without linking an assignment on the report.
                VendorAssignment own = assignments.findByEventId(reference).stream()
                        .filter(a -> a.getVendor() != null && recipientId.equals(a.getVendor().getUserId()))
                        .findFirst().orElse(null);
                if (own == null) continue;
                destination = AppNotification.Destination.VENDOR_ASSIGNMENT;
                reference = own.getId();
            } else if (recipient.getRole() == Role.ADMIN) {
                destination = AppNotification.Destination.ADMIN_OVERVIEW;
            } else {
                destination = AppNotification.Destination.COORDINATOR_EVENT;
            }
            notifications.notifyUser(recipientId, destination, reference, title,
                    issue.getEvent().getName() + ": " + issue.getTitle() + ". " + detail);
        }
    }

    public View note(Long id, Note request, String username) {
        EventIssue issue = locked(id);
        User user = actor(username);
        if (!visible(issue, user)) throw new AccessDeniedException("You do not have access to this issue");
        if (issue.getStatus() == EventIssue.Status.RESOLVED) {
            throw new BusinessException("This issue has already been resolved", "ISSUE_RESOLVED");
        }
        addUpdate(issue, user, request.note().trim());
        return View.from(issues.saveAndFlush(issue));
    }

    private EventIssue locked(Long id) {
        return issues.findForUpdate(id).orElseThrow(() -> new EntityNotFoundException("Issue", id));
    }

    private void addUpdate(EventIssue issue, User user, String note) {
        IssueUpdate update = new IssueUpdate();
        update.setIssue(issue);
        update.setAuthor(user);
        update.setNote(note);
        issue.getUpdates().add(update);
    }
}
