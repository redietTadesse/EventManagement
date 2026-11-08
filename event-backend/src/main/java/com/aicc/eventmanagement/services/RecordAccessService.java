package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.VendorAssignment;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.repositories.ChecklistRepository;
import com.aicc.eventmanagement.repositories.EventRepository;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorAssignmentRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecordAccessService {

    private final UserRepository userRepository;
    private final InquiryRepository inquiryRepository;
    private final EventRepository eventRepository;
    private final VendorRepository vendorRepository;
    private final VendorAssignmentRepository assignmentRepository;
    private final ChecklistRepository checklistRepository;

    public void requireInquiryAccess(Long inquiryId, String username) {
        User user = requireUser(username);
        if (isStaff(user.getRole())) return;

        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new EntityNotFoundException("Inquiry", inquiryId));
        if (user.getRole() != Role.CLIENT || !user.getId().equals(inquiry.getClientId())) {
            deny();
        }
    }

    public void requireClientInquiryListAccess(Long clientId, String username) {
        User user = requireUser(username);
        if (isStaff(user.getRole())) return;
        if (user.getRole() != Role.CLIENT || !user.getId().equals(clientId)) deny();
    }

    public void requireInquiryCreateOwner(Long requestedClientId, String username) {
        User user = requireUser(username);
        if (user.getRole() == Role.CLIENT) {
            if (!user.getId().equals(requestedClientId)) deny();
            return;
        }
        if (user.getRole() != Role.ADMIN) deny();

        User target = userRepository.findById(requestedClientId)
                .orElseThrow(() -> new EntityNotFoundException("Client", requestedClientId));
        if (target.getRole() != Role.CLIENT) deny();
    }

    public void requireEventAccess(Long eventId, String username) {
        User user = requireUser(username);
        if (isStaff(user.getRole())) return;

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));
        if (user.getRole() == Role.CLIENT) {
            if (event.getInquiry() != null && user.getId().equals(event.getInquiry().getClientId())) return;
            deny();
        }
        if (user.getRole() == Role.VENDOR) {
            Vendor vendor = vendorRepository.findByUserId(user.getId()).orElse(null);
            if (vendor != null && assignmentRepository.existsByEventIdAndVendorId(eventId, vendor.getId())) return;
        }
        deny();
    }

    public void requireAssignmentAccess(Long assignmentId, String username) {
        User user = requireUser(username);
        if (isStaff(user.getRole())) return;

        VendorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));
        Vendor vendor = user.getRole() == Role.VENDOR
                ? vendorRepository.findByUserId(user.getId()).orElse(null)
                : null;
        if (vendor == null || assignment.getVendor() == null
                || !vendor.getId().equals(assignment.getVendor().getId())) {
            deny();
        }
    }

    public void requireChecklistAccess(Long checklistId, String username, boolean completing) {
        Checklist checklist = checklistRepository.findById(checklistId)
                .orElseThrow(() -> new EntityNotFoundException("Checklist item", checklistId));
        requireEventAccess(checklist.getEvent().getId(), username);

        User user = requireUser(username);
        if (completing && user.getRole() == Role.VENDOR && checklist.getOwnerRole() != Role.VENDOR) {
            deny();
        }
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user was not found"));
    }

    private boolean isStaff(Role role) {
        return role == Role.COORDINATOR || role == Role.ADMIN;
    }

    private void deny() {
        throw new AccessDeniedException("You do not have access to this record");
    }
}
