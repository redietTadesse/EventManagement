package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Checklist;
import com.aicc.eventmanagement.entities.Event;
import com.aicc.eventmanagement.payload.CreateChecklistRequest;
import com.aicc.eventmanagement.payload.UpdateChecklistRequest;
import com.aicc.eventmanagement.repositories.ChecklistRepository;
import com.aicc.eventmanagement.repositories.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChecklistService {

    private final ChecklistRepository checklistRepository;
    private final EventRepository eventRepository;

    @Transactional
    public Checklist createChecklist(CreateChecklistRequest request) {
        log.info("Creating checklist item for event: {}", request.getEventId());
        
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + request.getEventId()));
        
        Checklist checklist = Checklist.builder()
                .event(event)
                .itemName(request.getItemName())
                .isComplete(false)
                .dueDate(request.getDueDate())
                .build();
        
        return checklistRepository.save(checklist);
    }

    public Checklist getChecklistById(Long id) {
        log.info("Fetching checklist item with id: {}", id);
        return checklistRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Checklist item not found with id: " + id));
    }

    public List<Checklist> getChecklistByEvent(Long eventId) {
        log.info("Fetching checklist for event: {}", eventId);
        return checklistRepository.findByEventId(eventId);
    }

    @Transactional
    public Checklist markAsComplete(Long id) {
        log.info("Marking checklist item {} as complete", id);
        Checklist checklist = getChecklistById(id);
        checklist.setComplete(true);
        return checklistRepository.save(checklist);
    }

    @Transactional
    public Checklist markAsIncomplete(Long id) {
        log.info("Marking checklist item {} as incomplete", id);
        Checklist checklist = getChecklistById(id);
        checklist.setComplete(false);
        return checklistRepository.save(checklist);
    }

    @Transactional
    public Checklist updateChecklist(Long id, UpdateChecklistRequest request) {
        log.info("Updating checklist item {}", id);
        Checklist checklist = getChecklistById(id);
        
        if (request.getItemName() != null) {
            checklist.setItemName(request.getItemName());
        }
        if (request.getDueDate() != null) {
            checklist.setDueDate(request.getDueDate());
        }
        if (request.getIsComplete() != null) {
            checklist.setComplete(request.getIsComplete());
        }
        
        return checklistRepository.save(checklist);
    }

    @Transactional
    public void deleteChecklist(Long id) {
        log.info("Deleting checklist item {}", id);
        Checklist checklist = getChecklistById(id);
        checklistRepository.delete(checklist);
    }

    public List<Checklist> getPendingChecklist(Long eventId) {
        log.info("Fetching pending checklist items for event: {}", eventId);
        return checklistRepository.findByEventIdAndIsComplete(eventId, false);
    }
}