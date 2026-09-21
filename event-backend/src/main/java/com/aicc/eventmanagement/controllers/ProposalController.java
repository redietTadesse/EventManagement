package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.repositories.InquiryRepository;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.services.InquiryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/client/proposals")
@RequiredArgsConstructor
@Slf4j
public class ProposalController {

    private final InquiryService inquiryService;
    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;

    /**
     * Direct "Accept" link from email – requires authentication.
     * Client clicks → proposal accepted → redirected to dashboard.
     */
    @GetMapping("/{id}/accept")
    public String acceptProposalDirect(@PathVariable Long id, @AuthenticationPrincipal UserDetails principal) {
        log.info("📧 Client accepted proposal via email link: {}", id);

        if (principal == null) {
            log.warn("Unauthenticated attempt to accept proposal {}", id);
            return "redirect:/login?error=authentication_required";
        }

        try {
            // Verify the inquiry belongs to this client
            Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inquiry", id));

            // Get user ID from username - need to look up user
            Long userId = getUserIdFromUsername(principal.getUsername());
            if (userId == null || !userId.equals(inquiry.getClientId())) {
                log.warn("User {} attempted to accept proposal {} belonging to client {}",
                    principal.getUsername(), id, inquiry.getClientId());
                return "redirect:/login?error=unauthorized";
            }

            inquiryService.acceptProposal(id, Role.CLIENT);
            return "redirect:/client/dashboard?accepted=true";
        } catch (EntityNotFoundException e) {
            log.error("Inquiry {} not found for acceptance", id);
            return "redirect:/login?error=proposal_not_found";
        } catch (Exception e) {
            log.error("Failed to auto-accept proposal {}: {}", id, e.getMessage());
            return "redirect:/login?error=proposal_expired";
        }
    }

    /**
     * Direct "Reject" link from email – requires authentication.
     * Client clicks → proposal rejected → redirected to dashboard.
     */
    @GetMapping("/{id}/reject")
    public String rejectProposalDirect(@PathVariable Long id, @AuthenticationPrincipal UserDetails principal) {
        log.info("📧 Client rejected proposal via email link: {}", id);

        if (principal == null) {
            log.warn("Unauthenticated attempt to reject proposal {}", id);
            return "redirect:/login?error=authentication_required";
        }

        try {
            // Verify the inquiry belongs to this client
            Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inquiry", id));

            // Get user ID from username - need to look up user
            Long userId = getUserIdFromUsername(principal.getUsername());
            if (userId == null || !userId.equals(inquiry.getClientId())) {
                log.warn("User {} attempted to reject proposal {} belonging to client {}",
                    principal.getUsername(), id, inquiry.getClientId());
                return "redirect:/login?error=unauthorized";
            }

            inquiryService.rejectProposal(id, "Rejected via email link", Role.CLIENT);
            return "redirect:/client/dashboard?rejected=true";
        } catch (EntityNotFoundException e) {
            log.error("Inquiry {} not found for rejection", id);
            return "redirect:/login?error=proposal_not_found";
        } catch (Exception e) {
            log.error("Failed to auto-reject proposal {}: {}", id, e.getMessage());
            return "redirect:/login?error=proposal_expired";
        }
    }

    /**
     * Look up user ID by username.
     * Uses UserRepository to properly resolve the user ID from username.
     */
    private Long getUserIdFromUsername(String username) {
        return userRepository.findByUsername(username)
            .map(User::getId)
            .orElse(null);
    }
}
