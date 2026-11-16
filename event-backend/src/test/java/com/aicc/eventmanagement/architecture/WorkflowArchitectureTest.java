package com.aicc.eventmanagement.architecture;

import org.junit.jupiter.api.Test;
import org.springframework.asm.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Checks compiled production code, including lambdas; DTO and booking statuses are separate domains. */
class WorkflowArchitectureTest {
    private static final String PREFIX = "com/aicc/eventmanagement/";
    private static final String ENGINE = PREFIX + "services/WorkflowEngine";
    private static final Set<String> ENTITIES = Set.of(
            PREFIX + "entities/Inquiry", PREFIX + "entities/Event", PREFIX + "entities/VendorAssignment");

    @Test
    void onlyEngineMayWriteLifecycleStateOrClaimAnAssignment() throws Exception {
        List<String> violations = new ArrayList<>();
        try (var files = Files.walk(Path.of("target/classes/com/aicc/eventmanagement"))) {
            for (Path file : files.filter(p -> p.toString().endsWith(".class")).toList()) {
                ClassReader reader = new ClassReader(Files.readAllBytes(file));
                String caller = reader.getClassName();
                if (caller.equals(ENGINE) || caller.startsWith(PREFIX + "entities/")) continue;
                reader.accept(new ClassVisitor(Opcodes.ASM9) {
                    @Override public MethodVisitor visitMethod(int access, String name, String descriptor,
                                                               String signature, String[] exceptions) {
                        return new MethodVisitor(Opcodes.ASM9) {
                            @Override public void visitMethodInsn(int opcode, String owner, String method,
                                                                  String desc, boolean isInterface) {
                                boolean setter = ENTITIES.contains(owner) && method.equals("setStatus");
                                boolean builder = ENTITIES.stream().anyMatch(e -> owner.startsWith(e + "$"))
                                        && method.equals("status");
                                boolean claim = owner.equals(PREFIX + "repositories/VendorAssignmentRepository")
                                        && method.equals("claimOpenAssignment");
                                if (setter || builder || claim) violations.add(caller + "." + name + " -> " + owner + "." + method);
                            }
                            @Override public void visitFieldInsn(int opcode, String owner, String field, String desc) {
                                if (opcode == Opcodes.PUTFIELD && ENTITIES.contains(owner) && field.equals("status"))
                                    violations.add(caller + "." + name + " writes " + owner + ".status");
                            }
                        };
                    }
                }, ClassReader.SKIP_DEBUG | ClassReader.SKIP_FRAMES);
            }
        }
        assertThat(violations).as("Route workflow mutations through WorkflowEngine").isEmpty();
    }
}
