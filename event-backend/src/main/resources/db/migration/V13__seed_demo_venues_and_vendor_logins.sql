-- Venues (currently zero rows — the proposal form's dropdown is empty without these)
INSERT INTO venues (name, description, capacity, location, hourly_rate, is_active)
SELECT 'Main Hall A', 'Large main hall, stage and AV ready', 500, 'AICC Ground Floor', 100000.00, 1
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A');

INSERT INTO venues (name, description, capacity, location, hourly_rate, is_active)
SELECT 'Main Hall B', 'Medium hall', 300, 'AICC Ground Floor', 75000.00, 1
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall B');

INSERT INTO venues (name, description, capacity, location, hourly_rate, is_active)
SELECT 'Ballroom', 'Grand ballroom with chandeliers', 400, 'AICC 2nd Floor', 120000.00, 1
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Ballroom');

INSERT INTO venues (name, description, capacity, location, hourly_rate, is_active)
SELECT 'Conference Center', 'Multi-room conference center', 1000, 'AICC Ground Floor', 200000.00, 1
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Conference Center');

INSERT INTO venues (name, description, capacity, location, hourly_rate, is_active)
SELECT 'Meeting Room B', 'Small meeting room', 100, 'AICC 1st Floor', 25000.00, 1
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Meeting Room B');

-- Vendor login #1 (Catering Plus) — will be assigned first because rating 4 > 3
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
SELECT 'vendor_cat1', 'vendor.cat1@aicc.et',
       '$2a$10$dJJpR6hKAkNAeF2taOXXoe5hG07oemMECVB4lAv/43F3a7Ur9frQC',
       'Catering Plus Manager', '0911223344', 'VENDOR', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'vendor_cat1');

UPDATE vendors
SET user_id = (SELECT id FROM users WHERE username = 'vendor_cat1'),
    email   = 'vendor.cat1@aicc.et'
WHERE company_name = 'Catering Plus' AND user_id IS NULL;

-- Vendor login #2 (Gourmet Catering) — will be assigned second after Catering Plus declines
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
SELECT 'vendor_cat2', 'vendor.cat2@aicc.et',
       '$2a$10$dJJpR6hKAkNAeF2taOXXoe5hG07oemMECVB4lAv/43F3a7Ur9frQC',
       'Gourmet Catering Manager', '0922345678', 'VENDOR', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'vendor_cat2');

INSERT INTO vendors (user_id, company_name, service_category, phone, email, rating, is_active)
SELECT u.id, 'Gourmet Catering', 'catering', '0987654321', 'vendor.cat2@aicc.et', 3, 1
FROM users u
WHERE u.username = 'vendor_cat2'
  AND NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Gourmet Catering');