-- Test accounts for end to end testing of every role.
-- Every account below uses the password: Test@1234
-- Emails use example.com, which is reserved and can never reach a real inbox.

-- ADMIN
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, token_version, created_at)
SELECT 'test_admin', 'test.admin@example.com',
       '$2a$10$FACx9Pyd/UtBdWtC1uT0zOmRTexY3ViDM42E7XLm1sUQQjn/tISNG',
       'Test Admin', '0900000001', 'ADMIN', 1, 0, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'test_admin' OR email = 'test.admin@example.com');

-- COORDINATOR
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, token_version, created_at)
SELECT 'test_coordinator', 'test.coordinator@example.com',
       '$2a$10$FACx9Pyd/UtBdWtC1uT0zOmRTexY3ViDM42E7XLm1sUQQjn/tISNG',
       'Test Coordinator', '0900000002', 'COORDINATOR', 1, 0, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'test_coordinator' OR email = 'test.coordinator@example.com');

-- CLIENT 1
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, token_version, created_at)
SELECT 'test_client1', 'test.client1@example.com',
       '$2a$10$FACx9Pyd/UtBdWtC1uT0zOmRTexY3ViDM42E7XLm1sUQQjn/tISNG',
       'Test Client One', '0900000003', 'CLIENT', 1, 0, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'test_client1' OR email = 'test.client1@example.com');

-- CLIENT 2 (for checking that one client cannot see another client's data)
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, token_version, created_at)
SELECT 'test_client2', 'test.client2@example.com',
       '$2a$10$FACx9Pyd/UtBdWtC1uT0zOmRTexY3ViDM42E7XLm1sUQQjn/tISNG',
       'Test Client Two', '0900000004', 'CLIENT', 1, 0, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'test_client2' OR email = 'test.client2@example.com');

-- VENDOR 1: login plus linked vendor profile
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, token_version, fayda_sandbox_verified_at, created_at)
SELECT 'test_vendor1', 'test.vendor1@example.com',
       '$2a$10$FACx9Pyd/UtBdWtC1uT0zOmRTexY3ViDM42E7XLm1sUQQjn/tISNG',
       'Test Catering Manager', '0900000011', 'VENDOR', 1, 0, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'test_vendor1' OR email = 'test.vendor1@example.com');

INSERT INTO vendors (user_id, company_name, service_category, description, phone, email, rating, is_active, flagged_for_deactivation, created_at)
SELECT u.id, 'Test Catering Co', 'catering', 'Test vendor for end to end testing',
       '0900000011', 'test.vendor1@example.com', 2.5, 1, 0, NOW()
FROM users u
WHERE u.username = 'test_vendor1'
  AND NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Test Catering Co');

-- VENDOR 2: same category, lower rating, so it is next in line when Vendor 1 declines
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, token_version, fayda_sandbox_verified_at, created_at)
SELECT 'test_vendor2', 'test.vendor2@example.com',
       '$2a$10$FACx9Pyd/UtBdWtC1uT0zOmRTexY3ViDM42E7XLm1sUQQjn/tISNG',
       'Test Banquets Manager', '0900000012', 'VENDOR', 1, 0, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'test_vendor2' OR email = 'test.vendor2@example.com');

INSERT INTO vendors (user_id, company_name, service_category, description, phone, email, rating, is_active, flagged_for_deactivation, created_at)
SELECT u.id, 'Test Banquets', 'catering', 'Second test vendor for decline and escalation testing',
       '0900000012', 'test.vendor2@example.com', 2.0, 1, 0, NOW()
FROM users u
WHERE u.username = 'test_vendor2'
  AND NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Test Banquets');

-- PENDING VENDOR APPLICANT: shows up in the admin applicant list, ready to approve or reject
INSERT INTO vendor_applications (company_name, contact_person, email, phone, service_category, description,
                                 website, established_year, username, password_hash, status, created_at)
SELECT 'Test Decor Studio', 'Test Applicant', 'test.applicant@example.com', '0900000021', 'catering',
       'Pending applicant for testing the vendor approval flow', NULL, 2020, 'test_applicant',
       '$2a$10$FACx9Pyd/UtBdWtC1uT0zOmRTexY3ViDM42E7XLm1sUQQjn/tISNG', 'PENDING', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM vendor_applications WHERE username = 'test_applicant')
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'test_applicant');