-- ==============================================
-- AICC Event Management System
-- Version 4
-- Adds the venues table and wires events.venue_id to it.
-- ==============================================

CREATE TABLE IF NOT EXISTS venues (
                                      id BIGINT PRIMARY KEY AUTO_INCREMENT,
                                      name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    capacity INT,
    location VARCHAR(255),
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active)
    );

-- events.venue_id was added in V1 as an unused hook. Link it now.
-- ON DELETE SET NULL: deleting a venue clears the link but keeps the event.
ALTER TABLE events
    ADD CONSTRAINT fk_event_venue
        FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;