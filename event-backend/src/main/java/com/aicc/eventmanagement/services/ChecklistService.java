package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.CreateChecklistRequest;
import com.aicc.eventmanagement.payload.UpdateChecklistRequest;
import com.aicc.eventmanagement.repositories.ChecklistRepository;
import com.aicc.eventmanagement.repositories.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChecklistService {

    private final ChecklistRepository checklistRepository;
    private final EventRepository eventRepository;

    private static final Map<String, List<ChecklistTemplate>> TEMPLATES = Map.of(
            "conference", List.of(
                    new ChecklistTemplate("main-hall", "Book main hall", -30),
                    new ChecklistTemplate("av-equipment", "Arrange AV equipment", -14),
                    new ChecklistTemplate("catering", "Arrange catering service", -14),
                    new ChecklistTemplate("security", "Arrange security", -7),
                    new ChecklistTemplate("registration-desk", "Set up registration desk", -1)),
            "wedding", List.of(
                    new ChecklistTemplate("ceremony-venue", "Book ceremony venue", -30),
                    new ChecklistTemplate("catering", "Arrange catering service", -14),
                    new ChecklistTemplate("photography", "Arrange photography", -14),
                    new ChecklistTemplate("music", "Book music / DJ", -14),
                    new ChecklistTemplate("flowers", "Order flowers", -7)),
            "trade_show", List.of(
                    new ChecklistTemplate("exhibition-space", "Book exhibition space", -30),
                    new ChecklistTemplate("booth-setup", "Arrange booth setup", -7),
                    new ChecklistTemplate("security", "Arrange security", -7),
                    new ChecklistTemplate("cleaning", "Arrange cleaning services", -1),
                    new ChecklistTemplate("exhibitor-list", "Confirm exhibitor list", -3)),
            "exhibition", List.of(
                    new ChecklistTemplate("exhibition-space", "Book exhibition space", -30),
                    new ChecklistTemplate("booth-setup", "Arrange booth setup", -7),
                    new ChecklistTemplate("security", "Arrange security", -7),
                    new ChecklistTemplate("cleaning", "Arrange cleaning services", -1),
                    new ChecklistTemplate("exhibitor-list", "Confirm exhibitor list", -3)),
            "concert", List.of(
                    new ChecklistTemplate("venue", "Book venue", -30),
                    new ChecklistTemplate("stage-setup", "Arrange stage setup", -7),
                    new ChecklistTemplate("av-equipment", "Arrange AV equipment", -3),
                    new ChecklistTemplate("security", "Arrange security", -7),
                    new ChecklistTemplate("artist-lineup", "Confirm artist line-up", -7)),
            "gala", List.of(
                    new ChecklistTemplate("ballroom", "Book ballroom", -30),
                    new ChecklistTemplate("catering", "Arrange catering service", -14),
                    new ChecklistTemplate("photography", "Arrange photography", -7),
                    new ChecklistTemplate("music", "Book music / DJ", -7),
                    new ChecklistTemplate("security", "Arrange security", -7)),
            "seminar", List.of(
                    new ChecklistTemplate("meeting-room", "Book meeting room", -14),
                    new ChecklistTemplate("av-equipment", "Arrange AV equipment", -7),
                    new ChecklistTemplate("catering", "Arrange catering", -7)));

    private static final List<ChecklistTemplate> FALLBACK_TEMPLATES = List.of(
            new ChecklistTemplate("venue", "Book venue", -14),
            new ChecklistTemplate("services", "Arrange services", -7));

    @Transactional
    public Checklist createChecklist(CreateChecklistRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found with id: " + request.getEventId()));
        List<Checklist> eventTasks = checklistRepository.findByEventIdWithDependencies(event.getId());

        Checklist checklist = Checklist.builder()
                .event(event)
                .itemName(request.getItemName())
                .dueDate(request.getDueDate())
                .ownerRole(request.getOwnerRole() != null ? request.getOwnerRole() : Role.COORDINATOR)
                .isComplete(false)
                .build();
        checklist.setDependencies(resolveDependencies(checklist, event.getId(), request.getDependencyIds(), eventTasks));
        event.addChecklistItem(checklist);
        return checklistRepository.save(checklist);
    }

    @Transactional(readOnly = true)
    public Checklist getChecklistById(Long id) {
        return checklistRepository.findByIdWithDependencies(id)
                .orElseThrow(() -> new EntityNotFoundException("Checklist item not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public List<Checklist> getChecklistByEvent(Long eventId) {
        return checklistRepository.findByEventIdWithDependencies(eventId);
    }

    @Transactional
    public Checklist markAsComplete(Long id) {
        Checklist checklist = getChecklistById(id);
        requirePrerequisitesComplete(checklist);
        checklist.setComplete(true);
        return checklistRepository.save(checklist);
    }

    @Transactional
    public Checklist markAsIncomplete(Long id) {
        Checklist checklist = getChecklistById(id);
        requireNoCompletedDependents(checklist);
        checklist.setComplete(false);
        return checklistRepository.save(checklist);
    }

    @Transactional
    public Checklist updateChecklist(Long id, UpdateChecklistRequest request) {
        Checklist checklist = getChecklistById(id);
        List<Checklist> eventTasks = checklistRepository.findByEventIdWithDependencies(checklist.getEvent().getId());
        Map<Long, Checklist> tasksById = indexById(eventTasks);

        if (request.getDependencyIds() != null) {
            checklist.setDependencies(resolveDependencies(
                    checklist, checklist.getEvent().getId(), request.getDependencyIds(), eventTasks));
        }
        if (request.getItemName() != null) {
            checklist.setItemName(request.getItemName());
        }
        if (Boolean.TRUE.equals(request.getClearDueDate()) && request.getDueDate() != null) {
            throw new BusinessException("Provide a due date or clear it, not both", "INVALID_CHECKLIST_DUE_DATE");
        }
        if (Boolean.TRUE.equals(request.getClearDueDate())) {
            checklist.setDueDate(null);
            if (checklist.getTemplateKey() != null) {
                checklist.setDueDateOverridden(true);
            }
        } else if (request.getDueDate() != null) {
            checklist.setDueDate(request.getDueDate());
            if (checklist.getTemplateKey() != null) {
                checklist.setDueDateOverridden(true);
            }
        }
        if (request.getOwnerRole() != null) {
            checklist.setOwnerRole(request.getOwnerRole());
        }
        if (request.getIsComplete() != null) {
            if (request.getIsComplete()) {
                requirePrerequisitesComplete(checklist);
            } else {
                requireNoCompletedDependents(checklist, tasksById.values());
            }
            checklist.setComplete(request.getIsComplete());
        }
        return checklistRepository.save(checklist);
    }

    @Transactional
    public void deleteChecklist(Long id) {
        Checklist checklist = getChecklistById(id);
        boolean hasDependents = checklistRepository.findByEventIdWithDependencies(checklist.getEvent().getId()).stream()
                .anyMatch(task -> task.getDependencies().stream().anyMatch(dependency -> dependency.getId().equals(id)));
        if (hasDependents) {
            throw new BusinessException("Remove this task from dependent tasks before deleting it", "CHECKLIST_TASK_HAS_DEPENDENTS");
        }
        checklistRepository.delete(checklist);
    }

    @Transactional(readOnly = true)
    public List<Checklist> getPendingChecklist(Long eventId) {
        return checklistRepository.findByEventIdWithDependencies(eventId).stream()
                .filter(task -> !task.isComplete())
                .toList();
    }

    /** Adds missing template rows without deleting or changing existing task content. */
    @Transactional
    public List<Checklist> generateMissingTemplateTasks(Long eventId) {
        Event event = eventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found with id: " + eventId));
        LocalDate eventDate = event.getInquiry() != null ? event.getInquiry().getEventDate() : null;
        if (eventDate == null) {
            throw new BusinessException("An event start date is required to generate checklist due dates", "EVENT_DATE_REQUIRED");
        }

        List<Checklist> existing = checklistRepository.findByEventIdWithDependencies(eventId);
        Map<String, Checklist> keyedTasks = new HashMap<>();
        existing.stream().filter(task -> task.getTemplateKey() != null)
                .forEach(task -> keyedTasks.putIfAbsent(task.getTemplateKey(), task));

        List<Checklist> newTasks = new ArrayList<>();
        List<Checklist> legacyAdoptions = new ArrayList<>();
        for (ChecklistTemplate template : templatesFor(event.getInquiry().getEventType())) {
            if (keyedTasks.containsKey(template.key())) {
                continue;
            }

            List<Checklist> legacyMatches = existing.stream()
                    .filter(task -> task.getTemplateKey() == null && template.itemName().equals(task.getItemName()))
                    .toList();
            if (legacyMatches.size() == 1) {
                Checklist legacy = legacyMatches.get(0);
                legacy.setTemplateKey(template.key());
                legacy.setOffsetDays(template.offsetDays());
                // Existing due dates may have been edited; keep them and stop treating them as template-derived.
                legacy.setDueDateOverridden(true);
                keyedTasks.put(template.key(), legacy);
                legacyAdoptions.add(legacy);
                continue;
            }
            if (!legacyMatches.isEmpty()) {
                log.warn("Event {} has {} legacy checklist rows named '{}'; leaving them unchanged and not adding a duplicate template row",
                        eventId, legacyMatches.size(), template.itemName());
                continue;
            }

            Checklist task = Checklist.builder()
                    .event(event)
                    .itemName(template.itemName())
                    .templateKey(template.key())
                    .offsetDays(template.offsetDays())
                    .dueDate(calculateDueDate(eventDate, template.offsetDays()))
                    .ownerRole(Role.COORDINATOR)
                    .dueDateOverridden(false)
                    .isComplete(false)
                    .build();
            event.addChecklistItem(task);
            keyedTasks.put(template.key(), task);
            newTasks.add(task);
        }

        if (!legacyAdoptions.isEmpty()) {
            checklistRepository.saveAll(legacyAdoptions);
        }
        if (!newTasks.isEmpty()) {
            checklistRepository.saveAll(newTasks);
        }
        return checklistRepository.findByEventIdWithDependencies(eventId);
    }

    @Transactional
    public void rescheduleGeneratedDueDates(Long eventId, LocalDate newEventStartDate) {
        if (newEventStartDate == null) {
            throw new BusinessException("New event start date is required", "INVALID_DATE");
        }
        List<Checklist> changed = checklistRepository.findByEventIdWithDependencies(eventId).stream()
                .filter(task -> task.getTemplateKey() != null)
                .filter(task -> task.getOffsetDays() != null)
                .filter(task -> !task.isDueDateOverridden())
                .peek(task -> task.setDueDate(calculateDueDate(newEventStartDate, task.getOffsetDays())))
                .toList();
        if (!changed.isEmpty()) {
            checklistRepository.saveAll(changed);
        }
    }

    private Set<Checklist> resolveDependencies(Checklist checklist, Long eventId, List<Long> dependencyIds,
                                                List<Checklist> eventTasks) {
        Set<Checklist> dependencies = new LinkedHashSet<>();
        Map<Long, Checklist> byId = indexById(eventTasks);
        for (Long dependencyId : dependencyIds == null ? List.<Long>of() : dependencyIds) {
            if (dependencyId == null) {
                throw new BusinessException("Dependency IDs cannot be null", "INVALID_CHECKLIST_DEPENDENCY");
            }
            if (checklist.getId() != null && checklist.getId().equals(dependencyId)) {
                throw new BusinessException("A checklist task cannot depend on itself", "CHECKLIST_SELF_DEPENDENCY");
            }
            Checklist dependency = byId.get(dependencyId);
            if (dependency == null) {
                String code = checklistRepository.existsById(dependencyId)
                        ? "CHECKLIST_DEPENDENCY_DIFFERENT_EVENT" : "CHECKLIST_DEPENDENCY_NOT_FOUND";
                throw new BusinessException("Dependencies must belong to the same event", code);
            }
            if (!eventId.equals(dependency.getEvent().getId())) {
                throw new BusinessException("Dependencies must belong to the same event", "CHECKLIST_DEPENDENCY_DIFFERENT_EVENT");
            }
            if (checklist.getId() != null && reaches(dependency, checklist.getId(), new HashSet<>())) {
                throw new BusinessException("This dependency would create a circular checklist dependency", "CHECKLIST_CIRCULAR_DEPENDENCY");
            }
            dependencies.add(dependency);
        }
        if (checklist.isComplete() && dependencies.stream().anyMatch(dependency -> !dependency.isComplete())) {
            throw new BusinessException("A completed task cannot depend on an incomplete prerequisite", "CHECKLIST_DEPENDENCY_INCOMPLETE");
        }
        return dependencies;
    }

    private boolean reaches(Checklist task, Long targetId, Set<Long> visited) {
        if (targetId.equals(task.getId())) {
            return true;
        }
        if (!visited.add(task.getId())) {
            return false;
        }
        return task.getDependencies().stream().anyMatch(dependency -> reaches(dependency, targetId, visited));
    }

    private void requirePrerequisitesComplete(Checklist task) {
        List<String> incomplete = task.getDependencies().stream()
                .filter(dependency -> !dependency.isComplete())
                .map(Checklist::getItemName)
                .sorted()
                .toList();
        if (!incomplete.isEmpty()) {
            throw new BusinessException("Complete prerequisites first: " + String.join(", ", incomplete),
                    "CHECKLIST_DEPENDENCIES_INCOMPLETE");
        }
    }

    private void requireNoCompletedDependents(Checklist task) {
        List<Checklist> eventTasks = checklistRepository.findByEventIdWithDependencies(task.getEvent().getId());
        requireNoCompletedDependents(task, eventTasks);
    }

    private void requireNoCompletedDependents(Checklist task, java.util.Collection<Checklist> eventTasks) {
        boolean hasCompletedDependent = eventTasks.stream()
                .filter(Checklist::isComplete)
                .anyMatch(dependent -> dependent.getDependencies().stream()
                        .anyMatch(dependency -> dependency.getId().equals(task.getId())));
        if (hasCompletedDependent) {
            throw new BusinessException("Mark dependent tasks incomplete before making this prerequisite incomplete",
                    "CHECKLIST_HAS_COMPLETED_DEPENDENTS");
        }
    }

    private Map<Long, Checklist> indexById(List<Checklist> tasks) {
        Map<Long, Checklist> result = new LinkedHashMap<>();
        tasks.stream().filter(task -> task.getId() != null).forEach(task -> result.put(task.getId(), task));
        return result;
    }

    private List<ChecklistTemplate> templatesFor(String eventType) {
        if (eventType == null) {
            return FALLBACK_TEMPLATES;
        }
        return TEMPLATES.getOrDefault(eventType.trim().toLowerCase(java.util.Locale.ROOT), FALLBACK_TEMPLATES);
    }

    static LocalDate calculateDueDate(LocalDate eventStartDate, int offsetDays) {
        if (eventStartDate == null) {
            throw new BusinessException("An event start date is required to calculate checklist due dates", "EVENT_DATE_REQUIRED");
        }
        return eventStartDate.plusDays(offsetDays);
    }

    private record ChecklistTemplate(String key, String itemName, int offsetDays) { }
}
