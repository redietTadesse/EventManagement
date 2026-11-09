-- Extends venue_bookings so one row can represent either a confirmed booking
-- or a coordinator hold. A hold has no event and carries an expiry.

ALTER TABLE venue_bookings
    MODIFY COLUMN event_id BIGINT NULL;

ALTER TABLE venue_bookings
    MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED';

ALTER TABLE venue_bookings
    ADD COLUMN expires_at DATETIME NULL AFTER status,
    ADD COLUMN held_by VARCHAR(255) NULL AFTER expires_at;

CREATE INDEX idx_venue_bookings_date_status
    ON venue_bookings (booking_date, status);