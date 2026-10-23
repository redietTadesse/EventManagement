-- ================================================
-- AICC Event Management System
-- Version 7 — venue_bookings table
-- ================================================

CREATE TABLE IF NOT EXISTS venue_bookings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    venue_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    booking_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE KEY uq_venue_date (venue_id, booking_date),
    INDEX idx_booking_date (booking_date),
    INDEX idx_status (status)
);