-- ==============================================
-- AICC Event Management System
-- Version 2
-- Adds vendor profiles and vendor availability.
-- Idempotent: safe even if the tables already exist.
-- ==============================================

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    company_name VARCHAR(255) NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    description TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    rating INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_service_category (service_category),
    INDEX idx_is_active (is_active),
    INDEX idx_rating (rating)
);

-- Vendor Booked Dates table
CREATE TABLE IF NOT EXISTS vendor_booked_dates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id BIGINT NOT NULL,
    booked_date DATE NOT NULL,
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_booked_date (booked_date),
    CONSTRAINT fk_booked_date_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);
