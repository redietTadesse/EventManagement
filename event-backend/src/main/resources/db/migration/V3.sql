-- ==============================================
-- AICC Event Management System
-- Version 3
-- Seed admin user and sample data
-- ==============================================

-- Admin user (password: Admin@123)
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

-- Coordinator
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

-- Client
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
SELECT * FROM (
    SELECT 
        'client' AS username,
        'client@aicc.et' AS email,
        '$2a$10$dJJpR6hKAkNAeF2taOXXoe5hG07oemMECVB4lAv/43F3a7Ur9frQC' AS password_hash,
        'John Client' AS full_name,
        NULL AS phone,
        'CLIENT' AS role,
        1 AS is_active
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'client'
);

-- Sample Vendors
INSERT INTO vendors (user_id, company_name, service_category, phone, email, rating, is_active)
SELECT * FROM (
    SELECT NULL, 'AV Solutions', 'av', '0912345678', 'av@example.com', 5, 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE company_name = 'AV Solutions'
);

INSERT INTO vendors (user_id, company_name, service_category, phone, email, rating, is_active)
SELECT * FROM (
    SELECT NULL, 'Catering Plus', 'catering', '0923456789', 'catering@example.com', 4, 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE company_name = 'Catering Plus'
);

INSERT INTO vendors (user_id, company_name, service_category, phone, email, rating, is_active)
SELECT * FROM (
    SELECT NULL, 'SecureGuard', 'security', '0934567890', 'secure@example.com', 4, 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE company_name = 'SecureGuard'
);

INSERT INTO vendors (user_id, company_name, service_category, phone, email, rating, is_active)
SELECT * FROM (
    SELECT NULL, 'CleanCo', 'cleaning', '0945678901', 'clean@example.com', 4, 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE company_name = 'CleanCo'
);

INSERT INTO vendors (user_id, company_name, service_category, phone, email, rating, is_active)
SELECT * FROM (
    SELECT NULL, 'PhotoPro', 'photography', '0956789012', 'photo@example.com', 5, 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE company_name = 'PhotoPro'
);

INSERT INTO vendors (user_id, company_name, service_category, phone, email, rating, is_active)
SELECT * FROM (
    SELECT NULL, 'Melody Events', 'music', '0967890123', 'music@example.com', 4, 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE company_name = 'Melody Events'
);