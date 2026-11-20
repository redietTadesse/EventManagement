ALTER TABLE inquiries ADD COLUMN preferred_venue_id BIGINT NULL;
ALTER TABLE inquiries ADD COLUMN preferred_venue_name VARCHAR(255) NULL;
ALTER TABLE inquiries ADD COLUMN preferred_vendor_names TEXT NULL;
