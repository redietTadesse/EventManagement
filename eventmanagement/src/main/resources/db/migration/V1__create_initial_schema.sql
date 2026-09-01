-- ==============================================
-- AICC Event Management System — Initial Schema
-- Version 1
-- ==============================================

-- 1. Users table (shared with Member 1)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 1.5. Vendors table
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
    CONSTRAINT fk_vendor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 1.6. Vendor Booked Dates table
CREATE TABLE IF NOT EXISTS vendor_booked_dates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id BIGINT NOT NULL,
    booked_date DATE NOT NULL,
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_booked_date (booked_date),
    CONSTRAINT fk_booked_date_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- 2. Inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    client_id BIGINT NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    expected_attendees INT NOT NULL,
    requirements TEXT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_client_id (client_id),
    INDEX idx_status (status),
    INDEX idx_event_date (event_date),
    CONSTRAINT fk_inquiry_client FOREIGN KEY (client_id) REFERENCES users(id)
);

-- 3. Events table
CREATE TABLE IF NOT EXISTS events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    inquiry_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    venue VARCHAR(255),
    venue_id BIGINT,
    venue_details JSON,
    unfilled_categories VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_inquiry_id (inquiry_id),
    INDEX idx_status (status),
    CONSTRAINT fk_event_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE
);

-- 4. Checklists table
CREATE TABLE IF NOT EXISTS checklists (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    is_complete BOOLEAN DEFAULT FALSE,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_id (event_id),
    CONSTRAINT fk_checklist_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 5. Vendor Assignments (placeholder for Member 3)
CREATE TABLE IF NOT EXISTS vendor_assignments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    vendor_id BIGINT NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    service_category VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    decline_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_id (event_id),
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_status (status),
    CONSTRAINT fk_assignment_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 6. Notifications (Member 3 will use)
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50) NOT NULL,
    reference_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);