package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.entities.Inquiry;
import com.aicc.eventmanagement.enums.EventStatus;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.payload.UpdateChecklistRequest;
import com.aicc.eventmanagement.repositories.ChecklistRepository;
import com.aicc.eventmanagement.repositories.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChecklistServiceTest {

    private static final LocalDate EVENT_DATE = LocalDate.of(2027, 5, 20);

    @Mock private ChecklistRepository checklistRepository;
    @Mock private EventRepository eventRepository;
    @InjectMocks private ChecklistService checklistService;

    private Event event;

    @BeforeEach
    void setUp() {
        event = event(1L, EVENT_DATE, "conference");
    }

    @Test
    void calculatesNegativeZeroAndPositiveOffsetsAsCalendarDays() {
        assertThat(ChecklistService.calculateDueDate(EVENT_DATE, -5)).isEqualTo(EVENT_DATE.minusDays(5));
        assertThat(ChecklistService.calculateDueDate(EVENT_DATE, 0)).isEqualTo(EVENT_DATE);
        assertThat(ChecklistService.calculateDueDate(EVENT_DATE, 1)).isEqualTo(EVENT_DATE.plusDays(1));
    }

    @Test
    void firstGenerationCreatesDatedCoordinatorTasksAndSecondRunAddsNothing() {
        when(eventRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(event));
        List<Checklist> rows = new ArrayList<>();
        stubRowsAndSaves(rows);

        List<Checklist> generated = checklistService.generateMissingTemplateTasks(1L);
        assertThat(generated).hasSize(5);
        assertThat(generated).allSatisfy(task -> {
            assertThat(task.getDueDate()).isNotNull();
            assertThat(task.getOwnerRole()).isEqualTo(Role.COORDINATOR);
            assertThat(task.getTemplateKey()).isNotBlank();
        });
        assertThat(find(generated, "Book main hall").getDueDate()).isEqualTo(EVENT_DATE.minusDays(30));
        assertThat(find(generated, "Set up registration desk").getDueDate()).isEqualTo(EVENT_DATE.minusDays(1));

        checklistService.generateMissingTemplateTasks(1L);

        assertThat(rows).hasSize(5);
        verify(checklistRepository, org.mockito.Mockito.times(1)).saveAll(ArgumentMatchers.<Checklist>anyIterable());
    }

    @Test
    void regenerationPreservesLegacyEditsCompletionAndManualRows() {
        when(eventRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(event));
        Checklist legacy = Checklist.builder()
                .id(10L).event(event).itemName("Book main hall").isComplete(true)
                .dueDate(LocalDate.of(2027, 4, 1)).ownerRole(Role.CLIENT).build();
        Checklist manual = Checklist.builder()
                .id(11L).event(event).itemName("Coordinator's custom task").isComplete(true)
                .dueDate(LocalDate.of(2027, 5, 1)).ownerRole(Role.ADMIN).build();
        List<Checklist> rows = new ArrayList<>(List.of(legacy, manual));
        stubRowsAndSaves(rows);

        checklistService.generateMissingTemplateTasks(1L);
        checklistService.generateMissingTemplateTasks(1L);

        assertThat(legacy.getItemName()).isEqualTo("Book main hall");
        assertThat(legacy.isComplete()).isTrue();
        assertThat(legacy.getDueDate()).isEqualTo(LocalDate.of(2027, 4, 1));
        assertThat(legacy.getOwnerRole()).isEqualTo(Role.CLIENT);
        assertThat(legacy.isDueDateOverridden()).isTrue();
        assertThat(manual.getTemplateKey()).isNull();
        assertThat(manual.isComplete()).isTrue();
        assertThat(manual.getDueDate()).isEqualTo(LocalDate.of(2027, 5, 1));
        assertThat(rows).hasSize(6);
        assertThat(rows.stream().filter(task -> "Book main hall".equals(task.getItemName()))).hasSize(1);
    }

    @Test
    void regenerationAddsATemplateThatWasIntroducedLater() {
        when(eventRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(event));
        List<Checklist> rows = new ArrayList<>();
        stubRowsAndSaves(rows);
        checklistService.generateMissingTemplateTasks(1L);
        rows.removeIf(task -> "Arrange security".equals(task.getItemName()));

        List<Checklist> regenerated = checklistService.generateMissingTemplateTasks(1L);

        assertThat(regenerated).hasSize(5);
        assertThat(regenerated).filteredOn(task -> "Arrange security".equals(task.getItemName())).hasSize(1);
    }

    @Test
    void incompletePrerequisiteBlocksCompletionAndCompletePrerequisiteAllowsIt() {
        Checklist prerequisite = task(20L, 1L, "Book venue", false);
        Checklist dependent = task(21L, 1L, "Set up room", false);
        dependent.setDependencies(new LinkedHashSet<>(List.of(prerequisite)));
        when(checklistRepository.findByIdWithDependencies(21L)).thenReturn(Optional.of(dependent));
        when(checklistRepository.save(dependent)).thenReturn(dependent);

        assertThatThrownBy(() -> checklistService.markAsComplete(21L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Book venue");

        prerequisite.setComplete(true);
        assertThat(checklistService.markAsComplete(21L).isComplete()).isTrue();
    }

    @Test
    void rejectsSelfDependency() {
        Checklist task = task(30L, 1L, "Task", false);
        when(checklistRepository.findByIdWithDependencies(30L)).thenReturn(Optional.of(task));
        when(checklistRepository.findByEventIdWithDependencies(1L)).thenReturn(List.of(task));
        UpdateChecklistRequest request = new UpdateChecklistRequest();
        request.setDependencyIds(List.of(30L));

        assertThatThrownBy(() -> checklistService.updateChecklist(30L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot depend on itself");
    }

    @Test
    void rejectsCrossEventDependency() {
        Checklist task = task(40L, 1L, "Task", false);
        when(checklistRepository.findByIdWithDependencies(40L)).thenReturn(Optional.of(task));
        when(checklistRepository.findByEventIdWithDependencies(1L)).thenReturn(List.of(task));
        when(checklistRepository.existsById(99L)).thenReturn(true);
        UpdateChecklistRequest request = new UpdateChecklistRequest();
        request.setDependencyIds(List.of(99L));

        assertThatThrownBy(() -> checklistService.updateChecklist(40L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("same event");
    }

    @Test
    void rejectsCircularDependency() {
        Checklist first = task(50L, 1L, "First", false);
        Checklist second = task(51L, 1L, "Second", false);
        second.setDependencies(new LinkedHashSet<>(List.of(first)));
        when(checklistRepository.findByIdWithDependencies(50L)).thenReturn(Optional.of(first));
        when(checklistRepository.findByEventIdWithDependencies(1L)).thenReturn(List.of(first, second));
        UpdateChecklistRequest request = new UpdateChecklistRequest();
        request.setDependencyIds(List.of(51L));

        assertThatThrownBy(() -> checklistService.updateChecklist(50L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("circular");
    }

    @Test
    void reschedulingMovesOnlyGeneratedTasksWithoutDueDateOverrides() {
        Checklist tracked = task(60L, 1L, "Tracked", false);
        tracked.setTemplateKey("tracked");
        tracked.setOffsetDays(-5);
        tracked.setDueDate(EVENT_DATE.minusDays(5));
        Checklist overridden = task(61L, 1L, "Overridden", false);
        overridden.setTemplateKey("overridden");
        overridden.setOffsetDays(-2);
        overridden.setDueDate(LocalDate.of(2027, 5, 1));
        overridden.setDueDateOverridden(true);
        Checklist manual = task(62L, 1L, "Manual", false);
        manual.setDueDate(LocalDate.of(2027, 5, 2));
        when(checklistRepository.findByEventIdWithDependencies(1L)).thenReturn(List.of(tracked, overridden, manual));

        checklistService.rescheduleGeneratedDueDates(1L, LocalDate.of(2027, 6, 1));

        assertThat(tracked.getDueDate()).isEqualTo(LocalDate.of(2027, 5, 27));
        assertThat(overridden.getDueDate()).isEqualTo(LocalDate.of(2027, 5, 1));
        assertThat(manual.getDueDate()).isEqualTo(LocalDate.of(2027, 5, 2));
        verify(checklistRepository).saveAll(ArgumentMatchers.<Checklist>anyIterable());
    }

    private void stubRowsAndSaves(List<Checklist> rows) {
        AtomicLong ids = new AtomicLong(100);
        when(checklistRepository.findByEventIdWithDependencies(1L)).thenAnswer(invocation -> new ArrayList<>(rows));
        doAnswer(invocation -> {
            Iterable<Checklist> saved = invocation.getArgument(0);
            List<Checklist> result = new ArrayList<>();
            for (Checklist task : saved) {
                if (task.getId() == null) task.setId(ids.incrementAndGet());
                if (!rows.contains(task)) rows.add(task);
                result.add(task);
            }
            return result;
        }).when(checklistRepository).saveAll(ArgumentMatchers.<Checklist>anyIterable());
    }

    private static Checklist find(List<Checklist> tasks, String name) {
        return tasks.stream().filter(task -> name.equals(task.getItemName())).findFirst().orElseThrow();
    }

    private static Checklist task(Long id, Long eventId, String name, boolean complete) {
        Event event = event(eventId, EVENT_DATE, "conference");
        return Checklist.builder().id(id).event(event).itemName(name).isComplete(complete)
                .ownerRole(Role.COORDINATOR).build();
    }

    private static Event event(Long id, LocalDate date, String type) {
        Inquiry inquiry = Inquiry.builder().id(id + 100).eventDate(date).eventType(type).build();
        return Event.builder().id(id).inquiry(inquiry).name("Test event")
                .status(EventStatus.EVENT_CREATED).checklist(new ArrayList<>()).build();
    }
}
