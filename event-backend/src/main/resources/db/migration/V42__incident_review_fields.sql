-- Existing reports already affected vendor scores under the original process.
ALTER TABLE post_event_reports
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    ADD COLUMN reviewed_by BIGINT NULL,
    ADD COLUMN reviewed_at DATETIME(6) NULL,
    ADD COLUMN review_notes TEXT NULL,
    ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'CLIENT_REPORT';

ALTER TABLE post_event_reports ALTER COLUMN status SET DEFAULT 'PENDING';
CREATE INDEX ix_post_event_reports_status_created ON post_event_reports (status, created_at);
