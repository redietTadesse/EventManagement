-- ==============================================
-- AICC Event Management System
-- Version 4
-- Add proposal JSON column to inquiries
-- ==============================================

ALTER TABLE inquiries
ADD COLUMN proposal JSON DEFAULT NULL;
