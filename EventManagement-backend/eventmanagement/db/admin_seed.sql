-- =============================================================
-- AICC Event Management - Initial admin seed
-- Run ONCE against the aicc_events database, e.g.:
--   mysql -u root -p aicc_events < db/admin_seed.sql
--
-- Default login:
--   username: admin
--   password: Admin@123
-- =============================================================

INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
VALUES (
    'admin',
    'admin@aicc.et',
    '$2a$10$dJJpR6hKAkNAeF2taOXXoe5hG07oemMECVB4lAv/43F3a7Ur9frQC', -- BCrypt('Admin@123')
    'AICC Administrator',
    NULL,
    'ADMIN',
    1
);

-- ------------------------------------------------------------------
-- Templates for staff accounts. Vendors and Coordinators cannot
-- self-register (the register endpoint only accepts CLIENT role).
-- Replace <bcrypt-hash> with a BCrypt hash of your chosen password.
-- ------------------------------------------------------------------
-- INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
-- VALUES ('coordinator1', 'coordinator@aicc.et', '<bcrypt-hash>', 'Events Coordinator', NULL, 'COORDINATOR', 1);
--
-- INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
-- VALUES ('vendor1', 'contact@vendor.et', '<bcrypt-hash>', 'Vendor Company', NULL, 'VENDOR', 1);