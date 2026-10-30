-- V8 added vendor_rating_comment but not vendor_rating, which the
-- VendorAssignment entity has always declared. Inserts into
-- vendor_assignments fail without it.

ALTER TABLE vendor_assignments
    ADD COLUMN vendor_rating DOUBLE NULL AFTER status;