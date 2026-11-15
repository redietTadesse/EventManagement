-- ==============================================
-- AICC Event Management System
-- Version 9
-- Seed login accounts: admin, coordinator, vendor
-- (idempotent — safe to run on fresh and existing DBs)
--
-- All accounts share the password: Admin@123
-- (BCrypt hash verified against Admin@123)
-- ==============================================

-- ── Admin account ──
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
SELECT * FROM (
    SELECT
        'admin' AS username,
        'admin@aicc.et' AS email,
        '$2a$10$dJJpR6hKAkNAeF2taOXXoe5hG07oemMECVB4lAv/43F3a7Ur9frQC' AS password_hash,
        'AICC Administrator' AS full_name,
        NULL AS phone,
        'ADMIN' AS role,
        1 AS is_active
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin'
);

-- ── Coordinator account ──
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
SELECT * FROM (
    SELECT
        'coordinator' AS username,
        'coordinator@aicc.et' AS email,
        '$2a$10$dJJpR6hKAkNAeF2taOXXoe5hG07oemMECVB4lAv/43F3a7Ur9frQC' AS password_hash,
        'Event Coordinator' AS full_name,
        NULL AS phone,
        'COORDINATOR' AS role,
        1 AS is_active
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'coordinator'
);

-- ── Vendor user account ──
-- Vendors cannot self-register; this creates a VENDOR login that can be
-- used with the vendor portal endpoints (/api/vendors/**, assignments, etc.)
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
SELECT * FROM (
    SELECT
        'vendor' AS username,
        'vendor@aicc.et' AS email,
        '$2a$10$dJJpR6hKAkNAeF2taOXXoe5hG07oemMECVB4lAv/43F3a7Ur9frQC' AS password_hash,
        'EventPro Services' AS full_name,
        '0971234567' AS phone,
        'VENDOR' AS role,
        1 AS is_active
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'vendor'
);

-- ── Vendor profile linked to the vendor user account ──
-- (V3 sample vendors have user_id = NULL; this one has a real login)
INSERT INTO vendors (user_id, company_name, service_category, description, phone, email, rating, is_active)
SELECT * FROM (
    SELECT
        (SELECT id FROM users WHERE username = 'vendor') AS user_id,
        'EventPro Services' AS company_name,
        'av' AS service_category,
        'Audio-visual equipment, staging and lighting for events.' AS description,
        '0971234567' AS phone,
        'vendor@aicc.et' AS email,
        5 AS rating,
        1 AS is_active
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE company_name = 'EventPro Services'
);
