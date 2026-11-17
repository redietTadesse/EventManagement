-- Version 24 was previously used for inquiry scope on some installations.
-- Keep any issue tables already created by the earlier issue-tracking migration.
CREATE TABLE IF NOT EXISTS event_issues (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 0,
    event_id BIGINT NOT NULL,
    assignment_id BIGINT NULL,
    checklist_id BIGINT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(4000) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    reported_by BIGINT NOT NULL,
    responsible_user_id BIGINT NOT NULL,
    due_date DATE NULL,
    resolution_note VARCHAR(4000) NULL,
    resolved_by BIGINT NULL,
    resolved_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    INDEX idx_issue_event (event_id),
    INDEX idx_issue_status_due (status, due_date),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES vendor_assignments(id) ON DELETE SET NULL,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_by) REFERENCES users(id),
    FOREIGN KEY (responsible_user_id) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS issue_updates (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    issue_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    note VARCHAR(4000) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    FOREIGN KEY (issue_id) REFERENCES event_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB;
