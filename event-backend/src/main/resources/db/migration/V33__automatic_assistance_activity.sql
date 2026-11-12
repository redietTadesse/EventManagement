
CREATE TABLE assistance_activity (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 inquiry_id BIGINT NOT NULL,
 event_id BIGINT NULL,
 category VARCHAR(30) NOT NULL,
 title VARCHAR(255) NOT NULL,
 detail VARCHAR(1000) NOT NULL,
 needs_attention BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP(6) NOT NULL,
 CONSTRAINT fk_assistance_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE,
 CONSTRAINT fk_assistance_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);
CREATE INDEX ix_assistance_inquiry_time ON assistance_activity(inquiry_id, created_at);
