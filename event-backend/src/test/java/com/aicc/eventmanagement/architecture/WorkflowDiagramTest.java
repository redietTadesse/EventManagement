package com.aicc.eventmanagement.architecture;

import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.enums.VendorAssignmentStatus;
import com.aicc.eventmanagement.services.WorkflowEngine;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

/** Defense diagrams are derived from the actual engine, rather than a separately maintained flowchart. */
class WorkflowDiagramTest {
    @Test
    void exportEngineTransitionsAndAuthorizedRoles() throws Exception {
        WorkflowEngine engine = new WorkflowEngine();
        engine.init();
        StringBuilder events = new StringBuilder("stateDiagram-v2\n");
        for (EventStatus from : EventStatus.values()) {
            for (EventStatus to : EventStatus.values()) {
                if (!engine.isValidTransition(from, to)) continue;
                String roles = java.util.Arrays.stream(Role.values()).filter(role -> {
                    try { engine.validateTransition(from, to, role); return true; }
                    catch (SecurityException ex) { return false; }
                }).map(Enum::name).collect(java.util.stream.Collectors.joining(", "));
                events.append("    ").append(from).append(" --> ").append(to).append(": ").append(roles).append('\n');
            }
        }
        StringBuilder assignments = new StringBuilder("stateDiagram-v2\n");
        for (VendorAssignmentStatus from : VendorAssignmentStatus.values()) {
            for (VendorAssignmentStatus to : VendorAssignmentStatus.values()) {
                if (engine.isValidAssignmentTransition(from, to))
                    assignments.append("    ").append(from).append(" --> ").append(to).append('\n');
            }
        }
        Path directory = Path.of("target/evidence");
        Files.createDirectories(directory);
        Files.writeString(directory.resolve("event-workflow.mmd"), events);
        Files.writeString(directory.resolve("vendor-workflow.mmd"), assignments);
    }
}
