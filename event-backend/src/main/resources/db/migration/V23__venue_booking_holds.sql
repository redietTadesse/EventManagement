-- Keep the venue booking schema aligned with VenueBooking's existing hold model.
-- Holds do not have an event yet, and expire without requiring a cleanup job.
ALTER TABLE venue_bookings
    MODIFY COLUMN event_id BIGINT NULL,
    ADD COLUMN expires_at DATETIME NULL,
    ADD COLUMN held_by VARCHAR(255) NULL;
