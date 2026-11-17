ALTER TABLE inquiries
    ADD COLUMN coordinator_id BIGINT NULL,
    ADD COLUMN coordinator_version BIGINT NOT NULL DEFAULT 0,
    ADD INDEX idx_inquiry_coordinator (coordinator_id),
    ADD CONSTRAINT fk_inquiry_coordinator FOREIGN KEY (coordinator_id) REFERENCES users(id);

CREATE TABLE coordinator_assignment_history (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    inquiry_id BIGINT NOT NULL,
    previous_coordinator_id BIGINT NULL,
    previous_coordinator_name VARCHAR(255) NULL,
    coordinator_id BIGINT NOT NULL,
    coordinator_name VARCHAR(255) NOT NULL,
    changed_by_id BIGINT NOT NULL,
    changed_by_name VARCHAR(255) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    changed_at DATETIME(6) NOT NULL,
    INDEX idx_coordinator_history_inquiry (inquiry_id),
    FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE
) ENGINE=InnoDB;
