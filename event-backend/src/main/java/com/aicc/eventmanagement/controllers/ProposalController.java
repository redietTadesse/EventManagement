package com.aicc.eventmanagement.controllers;

import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.services.InquiryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Handles direct proposal response links from email.
 * Clients can accept or reject proposals directly from the email
 * without needing to log in first.
 */
@Controller
@RequestMapping("/client/proposals")
@RequiredArgsConstructor
@Slf4j
public class ProposalController {

    private final InquiryService inquiryService;

    /**
     * Direct "Accept" link from email – no login required.
     * Client clicks → proposal accepted → redirected to dashboard.
     */
    @GetMapping("/{id}/accept")
    public String acceptProposalDirect(@PathVariable Long id) {
        log.info("📧 Client accepted proposal via email link: {}", id);

        try {
            inquiryService.acceptProposal(id, Role.CLIENT);
            return "redirect:/client/dashboard?accepted=true";
        } catch (Exception e) {
            log.error("Failed to auto-accept proposal {}: {}", id, e.getMessage());
            return "redirect:/login?error=proposal_expired";
        }
    }

    /**
     * Direct "Reject" link from email.
     * Client clicks → proposal rejected → redirected to dashboard.
     */
    @GetMapping("/{id}/reject")
    public String rejectProposalDirect(@PathVariable Long id) {
        log.info("📧 Client rejected proposal via email link: {}", id);

        try {
            inquiryService.rejectProposal(id, "Rejected via email link", Role.CLIENT);
            return "redirect:/client/dashboard?rejected=true";
        } catch (Exception e) {
            log.error("Failed to auto-reject proposal {}: {}", id, e.getMessage());
            return "redirect:/login?error=proposal_expired";
        }
    }
}
