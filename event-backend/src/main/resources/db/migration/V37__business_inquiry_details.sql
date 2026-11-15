ALTER TABLE inquiries ADD COLUMN event_name VARCHAR(200) NULL,
 ADD COLUMN unmet_needs TEXT NULL, ADD COLUMN experience VARCHAR(10) NULL,
 ADD COLUMN proposal_version INT NOT NULL DEFAULT 0;
ALTER TABLE venues ADD COLUMN layout_capacities TEXT NULL;
CREATE TABLE proposal_revisions (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, inquiry_id BIGINT NOT NULL,
 revision_number INT NOT NULL, proposal_json LONGTEXT NOT NULL,
 agreement_archive LONGTEXT NULL, created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_proposal_revision (inquiry_id, revision_number),
 FOREIGN KEY (inquiry_id) REFERENCES inquiries(id)
);
ALTER TABLE users ADD COLUMN google_subject VARCHAR(255) NULL UNIQUE;
