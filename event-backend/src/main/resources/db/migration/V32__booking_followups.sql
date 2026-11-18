CREATE TABLE booking_followups (
 inquiry_id BIGINT PRIMARY KEY,
 stage_token VARCHAR(64) NOT NULL,
 stage VARCHAR(40) NOT NULL,
 started_at TIMESTAMP(6) NOT NULL,
 first_sent_at TIMESTAMP(6) NULL,
 last_sent_at TIMESTAMP(6) NULL,
 next_at TIMESTAMP(6) NULL,
 sent_count INT NOT NULL DEFAULT 0,
 escalated_at TIMESTAMP(6) NULL,
 paused BOOLEAN NOT NULL DEFAULT FALSE,
 CONSTRAINT fk_followup_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE
);
