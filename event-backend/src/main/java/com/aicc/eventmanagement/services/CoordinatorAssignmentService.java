package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.*;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.exceptions.*;
import com.aicc.eventmanagement.payload.CoordinatorAssignmentPayload.*;
import com.aicc.eventmanagement.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CoordinatorAssignmentService {
    private final InquiryRepository inquiries;
    private final UserRepository users;
    private final EventIssueRepository issues;

    private User actor(String username) {
        return users.findByUsername(username).orElseThrow(() -> new AccessDeniedException("User not found"));
    }

    private Inquiry locked(Long id) {
        return inquiries.findForCoordinatorUpdate(id).orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
    }

    private boolean active(Inquiry inquiry) {
        EventStatus status = inquiry.getEvent() == null ? inquiry.getStatus() : inquiry.getEvent().getStatus();
        return !List.of(EventStatus.CANCELLED, EventStatus.COMPLETED, EventStatus.CLOSED,
                EventStatus.PROPOSAL_REJECTED).contains(status);
    }

    @Transactional(readOnly = true)
    public Ownership get(Long id) {
        Inquiry inquiry = inquiries.findById(id).orElseThrow(() -> new EntityNotFoundException("Inquiry", id));
        return view(inquiry);
    }

    @Transactional(readOnly = true)
    public List<Workload> workloads() {
        List<Inquiry> current = inquiries.findAll().stream().filter(this::active).toList();
        return users.findByRoleOrderByUsernameAsc(Role.COORDINATOR).stream().map(user ->
                new Workload(Person.from(user),
                        current.stream().filter(inquiry -> ownedBy(inquiry, user) && inquiry.getEvent() == null).count(),
                        current.stream().filter(inquiry -> ownedBy(inquiry, user) && inquiry.getEvent() != null).count()))
                .toList();
    }

    private boolean ownedBy(Inquiry inquiry, User user) {
        return inquiry.getCoordinator() != null && inquiry.getCoordinator().getId().equals(user.getId());
    }

    public Ownership claim(Long id, String username) {
        User user = actor(username);
        if (user.getRole() != Role.COORDINATOR || !user.isActive()) {
            throw new AccessDeniedException("Only active coordinators can claim work");
        }
        Inquiry inquiry = locked(id);
        if (ownedBy(inquiry, user)) return view(inquiry);
        if (inquiry.getCoordinator() != null) {
            throw new BusinessException("This work already has a lead coordinator. Ask an administrator to reassign it.",
                    "COORDINATOR_CONFLICT");
        }
        change(inquiry, user, user, "Coordinator claimed unassigned work");
        return view(inquiry);
    }

    public Ownership assign(Long id, Assign request, String username) {
        User actor = actor(username);
        if (actor.getRole() != Role.ADMIN) throw new AccessDeniedException("Only administrators can reassign work");
        Inquiry inquiry = locked(id);
        if (inquiry.getCoordinatorVersion() != request.expectedVersion()) {
            throw new BusinessException("The coordinator assignment changed. Refresh before assigning.",
                    "COORDINATOR_CONFLICT");
        }
        User coordinator = users.findById(request.coordinatorId())
                .filter(user -> user.getRole() == Role.COORDINATOR && user.isActive())
                .orElseThrow(() -> new BusinessException("Choose an active coordinator", "INVALID_COORDINATOR"));
        if (!ownedBy(inquiry, coordinator)) change(inquiry, coordinator, actor, request.reason().trim());
        return view(inquiry);
    }

    public Inquiry pickUpForProposal(Long id, String username) {
        User user = actor(username);
        if (user.getRole() != Role.COORDINATOR || !user.isActive()) {
            throw new AccessDeniedException("Only active coordinators can pick up inquiries");
        }
        Inquiry inquiry = locked(id);
        if (inquiry.getStatus() == EventStatus.INQUIRY_SUBMITTED && inquiry.getCoordinator() == null) {
            change(inquiry, user, user, "Coordinator picked up the inquiry by sending its first proposal");
        }
        return inquiry;
    }

    private void change(Inquiry inquiry, User coordinator, User actor, String reason) {
        if (!active(inquiry)) throw new BusinessException("Closed work cannot be reassigned", "WORK_CLOSED");
        User previous = inquiry.getCoordinator();
        CoordinatorAssignmentHistory history = new CoordinatorAssignmentHistory();
        history.setInquiry(inquiry);
        history.setPreviousCoordinatorId(previous == null ? null : previous.getId());
        history.setPreviousCoordinatorName(previous == null ? null : Person.from(previous).name());
        history.setCoordinatorId(coordinator.getId());
        history.setCoordinatorName(Person.from(coordinator).name());
        history.setChangedById(actor.getId());
        history.setChangedByName(Person.from(actor).name());
        history.setReason(reason);
        inquiry.getCoordinatorHistory().add(history);
        inquiry.setCoordinator(coordinator);
        inquiry.setCoordinatorVersion(inquiry.getCoordinatorVersion() + 1);
        if (inquiry.getEvent() != null) {
            transferIssues(inquiry.getEvent().getId(), previous, coordinator, actor);
        }
        inquiries.saveAndFlush(inquiry);
    }

    private void transferIssues(Long eventId, User previous, User coordinator, User actor) {
        for (EventIssue candidate : issues.findByEventIdOrderByCreatedAtDesc(eventId)) {
            EventIssue issue = issues.findForUpdate(candidate.getId()).orElseThrow();
            boolean transfer = previous == null
                    ? issue.getResponsible().getRole() == Role.COORDINATOR
                    : issue.getResponsible().getId().equals(previous.getId());
            if (issue.getStatus() == EventIssue.Status.RESOLVED || !transfer
                    || issue.getResponsible().getId().equals(coordinator.getId())) continue;
            String previousName = Person.from(issue.getResponsible()).name();
            issue.setResponsible(coordinator);
            IssueUpdate update = new IssueUpdate();
            update.setIssue(issue);
            update.setAuthor(actor);
            update.setNote("Coordinator handover from " + previousName
                    + " to " + Person.from(coordinator).name());
            issue.getUpdates().add(update);
        }
    }

    private Ownership view(Inquiry inquiry) {
        return new Ownership(Person.from(inquiry.getCoordinator()), inquiry.getCoordinatorVersion(),
                inquiry.getCoordinatorHistory().stream()
                        .sorted(Comparator.comparing(CoordinatorAssignmentHistory::getChangedAt).reversed())
                        .map(Change::from).toList());
    }
}
