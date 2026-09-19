package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Service
public class WorkflowEngine {

    private final Map<EventStatus, Set<EventStatus>> transitionTable = new HashMap<>();
    private final Map<String, Set<Role>> transitionRoleMap = new HashMap<>();

    // Assignment status transitions (not event status)
    private final Map<VendorAssignmentStatus, Set<VendorAssignmentStatus>> assignmentTransitionTable = new HashMap<>();
    private final Map<String, Set<Role>> assignmentTransitionRoleMap = new HashMap<>();

    @PostConstruct
    public void init() {

        // 1. EVENT TRANSITION TABLE
        transitionTable.put(EventStatus.INQUIRY_SUBMITTED,
                Set.of(EventStatus.PROPOSAL_SENT, EventStatus.CLOSED));
        transitionTable.put(EventStatus.PROPOSAL_SENT,
                Set.of(EventStatus.PROPOSAL_ACCEPTED, EventStatus.PROPOSAL_REJECTED));
        transitionTable.put(EventStatus.PROPOSAL_ACCEPTED,
                Set.of(EventStatus.EVENT_CREATED));
        transitionTable.put(EventStatus.PROPOSAL_REJECTED,
                Set.of(EventStatus.CLOSED));
        transitionTable.put(EventStatus.EVENT_CREATED,
                Set.of(EventStatus.AWAITING_VENDORS, EventStatus.NEEDS_COORDINATOR, EventStatus.CLOSED));
        transitionTable.put(EventStatus.CLOSED, Set.of());

        transitionTable.put(EventStatus.AWAITING_VENDORS,
                Set.of(EventStatus.CONFIRMED, EventStatus.NEEDS_COORDINATOR, EventStatus.CANCELLED));
        transitionTable.put(EventStatus.CONFIRMED,
                Set.of(EventStatus.COMPLETED, EventStatus.CANCELLED));
        transitionTable.put(EventStatus.NEEDS_COORDINATOR,
                Set.of(EventStatus.AWAITING_VENDORS, EventStatus.CANCELLED));
        transitionTable.put(EventStatus.COMPLETED, Set.of());
        transitionTable.put(EventStatus.CANCELLED, Set.of());

        // 2. ROLE MAP
        transitionRoleMap.put("INQUIRY_SUBMITTED_PROPOSAL_SENT", Set.of(Role.COORDINATOR));
        transitionRoleMap.put("INQUIRY_SUBMITTED_CLOSED", Set.of(Role.CLIENT, Role.COORDINATOR));

        transitionRoleMap.put("PROPOSAL_SENT_PROPOSAL_ACCEPTED", Set.of(Role.CLIENT));
        transitionRoleMap.put("PROPOSAL_SENT_PROPOSAL_REJECTED", Set.of(Role.CLIENT));

        transitionRoleMap.put("PROPOSAL_ACCEPTED_EVENT_CREATED", Set.of(Role.COORDINATOR));

        transitionRoleMap.put("PROPOSAL_REJECTED_CLOSED", Set.of(Role.ADMIN));
        transitionRoleMap.put("EVENT_CREATED_AWAITING_VENDORS", Set.of(Role.COORDINATOR));
        transitionRoleMap.put("EVENT_CREATED_NEEDS_COORDINATOR", Set.of(Role.COORDINATOR));
        transitionRoleMap.put("EVENT_CREATED_CLOSED", Set.of(Role.ADMIN));

        transitionRoleMap.put("AWAITING_VENDORS_CONFIRMED", Set.of(Role.VENDOR));
        transitionRoleMap.put("AWAITING_VENDORS_NEEDS_COORDINATOR", Set.of(Role.VENDOR, Role.COORDINATOR));
        transitionRoleMap.put("AWAITING_VENDORS_CANCELLED", Set.of(Role.CLIENT, Role.COORDINATOR));

        transitionRoleMap.put("CONFIRMED_COMPLETED", Set.of(Role.ADMIN, Role.COORDINATOR));
        transitionRoleMap.put("CONFIRMED_CANCELLED", Set.of(Role.CLIENT, Role.COORDINATOR));

        transitionRoleMap.put("NEEDS_COORDINATOR_AWAITING_VENDORS", Set.of(Role.COORDINATOR));
        transitionRoleMap.put("NEEDS_COORDINATOR_CANCELLED", Set.of(Role.CLIENT, Role.COORDINATOR));

        // 3. ASSIGNMENT STATUS TRANSITIONS
        assignmentTransitionTable.put(VendorAssignmentStatus.PENDING,
                Set.of(VendorAssignmentStatus.ACCEPTED, VendorAssignmentStatus.DECLINED, VendorAssignmentStatus.OPEN));
        assignmentTransitionTable.put(VendorAssignmentStatus.OPEN,
                Set.of(VendorAssignmentStatus.PENDING, VendorAssignmentStatus.CANCELLED));
        assignmentTransitionTable.put(VendorAssignmentStatus.ACCEPTED, Set.of());
        assignmentTransitionTable.put(VendorAssignmentStatus.DECLINED, Set.of());
        assignmentTransitionTable.put(VendorAssignmentStatus.COMPLETED, Set.of());

        // 4. ASSIGNMENT ROLE MAP
        assignmentTransitionRoleMap.put("PENDING_ACCEPTED", Set.of(Role.VENDOR));
        assignmentTransitionRoleMap.put("PENDING_DECLINED", Set.of(Role.VENDOR));
        assignmentTransitionRoleMap.put("PENDING_OPEN", Set.of(Role.VENDOR, Role.COORDINATOR));
        assignmentTransitionRoleMap.put("OPEN_PENDING", Set.of(Role.VENDOR));
        assignmentTransitionRoleMap.put("OPEN_CANCELLED", Set.of(Role.COORDINATOR));
    }

    // ===== EVENT METHODS =====

    public boolean isValidTransition(EventStatus from, EventStatus to) {
        return transitionTable.getOrDefault(from, Set.of()).contains(to);
    }

    public void validateTransition(EventStatus from, EventStatus to, Role userRole) {
        if (!isValidTransition(from, to)) {
            throw new IllegalStateException(
                    String.format("Invalid transition: %s -> %s is not allowed.", from, to)
            );
        }

        String key = from.name() + "_" + to.name();
        Set<Role> allowedRoles = transitionRoleMap.get(key);

        if (allowedRoles == null || !allowedRoles.contains(userRole)) {
            throw new SecurityException(
                    String.format("Role %s is not authorized for transition %s -> %s. Allowed: %s",
                            userRole, from, to, allowedRoles)
            );
        }
    }

    // ===== ASSIGNMENT METHODS =====

    public boolean isValidAssignmentTransition(VendorAssignmentStatus from, VendorAssignmentStatus to) {
        return assignmentTransitionTable.getOrDefault(from, Set.of()).contains(to);
    }

    public void validateAssignmentTransition(VendorAssignmentStatus from, VendorAssignmentStatus to, Role userRole) {
        if (!isValidAssignmentTransition(from, to)) {
            throw new IllegalStateException(
                    String.format("Invalid assignment transition: %s -> %s is not allowed.", from, to)
            );
        }

        String key = from.name() + "_" + to.name();
        Set<Role> allowedRoles = assignmentTransitionRoleMap.get(key);

        if (allowedRoles == null || !allowedRoles.contains(userRole)) {
            throw new SecurityException(
                    String.format("Role %s is not authorized for assignment transition %s -> %s. Allowed: %s",
                            userRole, from, to, allowedRoles)
            );
        }
    }
}
