-- ============================================================
-- V8: Create transition_history table for the audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS transition_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    reference_id VARCHAR(100) NOT NULL,
    reference_type VARCHAR(20) NOT NULL,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    triggered_by VARCHAR(20) NOT NULL,
    performed_by_username VARCHAR(100) NULL,
    reason TEXT NULL,
    occurred_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_history_reference (reference_type, reference_id),
    INDEX idx_history_occurred_at (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;