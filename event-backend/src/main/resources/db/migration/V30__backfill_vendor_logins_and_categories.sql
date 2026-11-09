-- Backfill demo credentials for every vendor that predates user-linked vendor
-- accounts, then add one active vendor for each external service category.
-- All generated vendor accounts use username vendor_<vendor-id> and the
-- repository's documented demo password Admin@123.

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Booth Setup Demo', 'booth_setup', 'Trade-show booth setup and dismantling.', '0911000301', 'booth.setup@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE service_category = 'booth_setup' AND is_active = 1);

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Exhibitor Services Demo', 'exhibitors', 'Exhibitor coordination and support.', '0911000302', 'exhibitors@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE service_category = 'exhibitors' AND is_active = 1);

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Stage Setup Demo', 'stage_setup', 'Stage construction and event rigging.', '0911000303', 'stage.setup@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE service_category = 'stage_setup' AND is_active = 1);

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Artists Demo', 'artists', 'Artist booking and performance coordination.', '0911000304', 'artists@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE service_category = 'artists' AND is_active = 1);

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Flowers Demo', 'flowers', 'Floral design and event decoration.', '0911000305', 'flowers@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE service_category = 'flowers' AND is_active = 1);

INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
SELECT CONCAT('vendor_', v.id),
       CONCAT('vendor_', v.id, '@aicc.et'),
       '$2a$10$dJJpR6hKAkNAeF2taOXXoe5hG07oemMECVB4lAv/43F3a7Ur9frQC',
       v.company_name,
       v.phone,
       'VENDOR',
       1
FROM vendors v
WHERE v.is_active = 1
  AND v.user_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.username = CONCAT('vendor_', v.id));

UPDATE vendors v
JOIN users u ON u.username = CONCAT('vendor_', v.id)
SET v.user_id = u.id,
    v.email = COALESCE(NULLIF(v.email, ''), u.email)
WHERE v.user_id IS NULL;
