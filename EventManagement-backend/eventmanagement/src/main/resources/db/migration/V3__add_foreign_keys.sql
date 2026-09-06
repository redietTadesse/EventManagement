-- ==============================================
-- AICC Event Management System
-- Version 3
-- Adds foreign key constraints (split out of V1).
-- Requires: vendors.user_id column (created in V1/V2).
-- ==============================================

-- Add foreign key for vendors table
ALTER TABLE vendors ADD CONSTRAINT fk_vendor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
