ALTER TABLE checklists
    ADD COLUMN template_key VARCHAR(100) NULL,
    ADD COLUMN offset_days INT NULL,
    ADD COLUMN due_date_overridden BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN owner_role VARCHAR(20) NOT NULL DEFAULT 'COORDINATOR',
    ADD CONSTRAINT uk_checklists_event_template UNIQUE (event_id, template_key);

CREATE TABLE checklist_dependencies (
    checklist_id BIGINT NOT NULL,
    prerequisite_id BIGINT NOT NULL,
    PRIMARY KEY (checklist_id, prerequisite_id),
    INDEX idx_checklist_dependency_prerequisite (prerequisite_id),
    CONSTRAINT fk_checklist_dependency_task
        FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
    CONSTRAINT fk_checklist_dependency_prereq
        FOREIGN KEY (prerequisite_id) REFERENCES checklists(id) ON DELETE CASCADE
) ENGINE=InnoDB;
