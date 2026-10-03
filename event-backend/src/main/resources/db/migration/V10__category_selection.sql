ALTER TABLE inquiries ADD COLUMN requested_categories TEXT;
ALTER TABLE inquiries ADD COLUMN categories TEXT;
ALTER TABLE events ADD COLUMN required_categories TEXT;
