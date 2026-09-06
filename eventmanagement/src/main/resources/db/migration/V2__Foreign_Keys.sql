-- ==============================================
-- AICC Event Management System
-- Version 2
-- Adds foreign key constraints for all tables
-- ==============================================

-- Users → Inquiries
ALTER TABLE inquiries ADD CONSTRAINT fk_inquiry_client 
    FOREIGN KEY (client_id) REFERENCES users(id);

-- Inquiries → Events
ALTER TABLE events ADD CONSTRAINT fk_event_inquiry 
    FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE;

-- Events → Checklists
ALTER TABLE checklists ADD CONSTRAINT fk_checklist_event 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Vendors → Vendor Booked Dates
ALTER TABLE vendor_booked_dates ADD CONSTRAINT fk_booked_date_vendor 
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

-- Vendors → Vendor Assignments
ALTER TABLE vendor_assignments ADD CONSTRAINT fk_assignment_vendor 
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

-- Events → Vendor Assignments
ALTER TABLE vendor_assignments ADD CONSTRAINT fk_assignment_event 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Vendors → Users
ALTER TABLE vendors ADD CONSTRAINT fk_vendor_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Users → Notifications
ALTER TABLE notifications ADD CONSTRAINT fk_notification_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;