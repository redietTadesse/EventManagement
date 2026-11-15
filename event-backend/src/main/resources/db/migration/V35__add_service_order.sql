-- 1. Add the Job Packet instructions to the assignment
ALTER TABLE vendor_assignments ADD COLUMN service_order TEXT;

-- 2. Add a flag to vendors for the 3-Strike Rule
ALTER TABLE vendors ADD COLUMN flagged_for_deactivation BOOLEAN DEFAULT FALSE;

-- 3. Create the Post-Event Report table
CREATE TABLE post_event_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    vendor_id BIGINT NOT NULL,
    incident_type VARCHAR(50) NOT NULL,
    notes TEXT,
    score_penalty INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);