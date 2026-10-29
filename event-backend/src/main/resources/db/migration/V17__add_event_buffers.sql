-- Add end_date to inquiries to support multi-day events
ALTER TABLE inquiries ADD COLUMN end_date DATE NULL;

-- Add buffer days to venues (default 1 day for setup, 1 day for teardown)
ALTER TABLE venues ADD COLUMN setup_buffer_days INT DEFAULT 1;
ALTER TABLE venues ADD COLUMN teardown_buffer_days INT DEFAULT 1;
