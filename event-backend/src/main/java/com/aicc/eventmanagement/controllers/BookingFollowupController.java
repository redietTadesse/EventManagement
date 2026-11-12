package com.aicc.eventmanagement.controllers;
import com.aicc.eventmanagement.services.BookingFollowupService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/booking-followups")
@PreAuthorize("hasRole('COORDINATOR')")
public class BookingFollowupController {
    private final BookingFollowupService followups;
    public record Pause(boolean paused) {}
    @GetMapping public List<BookingFollowupService.View> list(Principal principal) {
        return followups.list(principal.getName());
    }
    @PatchMapping("/{id}/pause")
    public void pause(@PathVariable Long id, @RequestBody Pause request, Principal principal) {
        followups.pause(id, principal.getName(), request.paused());
    }
}
