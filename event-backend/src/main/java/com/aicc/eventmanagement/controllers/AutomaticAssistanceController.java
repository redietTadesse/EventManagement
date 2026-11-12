
package com.aicc.eventmanagement.controllers;
import com.aicc.eventmanagement.services.AutomaticAssistance;
import com.aicc.eventmanagement.entities.AssistanceActivity;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.beans.factory.annotation.Value;
import java.security.Principal;
import java.util.List;
@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/automatic-assistance")
@PreAuthorize("hasRole('COORDINATOR')")
public class AutomaticAssistanceController {
 private final AutomaticAssistance assistance;
 @Value("${app.followups.interval-hours:48}") private int reminderHours;
 @Value("${app.followups.reminder-limit:2}") private int reminderLimit;
 @Value("${app.vendor.offer-expiry-hours:72}") private int vendorHours;
 @Value("${app.followups.enabled:true}") private boolean remindersEnabled;
 public record Overview(List<AssistanceActivity> activity, int reminderHours, int reminderLimit, int vendorHours, boolean remindersEnabled) {}
 @GetMapping public Overview overview(Principal principal) {
   return new Overview(assistance.recent(principal.getName()), Math.max(1,reminderHours),
       Math.max(1,reminderLimit), Math.max(1,vendorHours), remindersEnabled);
 }
}
