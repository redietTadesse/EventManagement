-- ============================================================================
-- V29 - Seed additional vendors and a complete escalation demo event.
-- ============================================================================
-- Purpose:
--   Populate the database with enough vendors per required service category so
--   the vendor escalation / auto-reassign path can be demonstrated end-to-end:
--     ranked offer -> decline -> next-ranked eligible vendor offered/accepted.
--
--   It also creates a self-contained demo event ("Escalation Showcase") whose
--   AV category records a full decline -> accept chain (Elite AV declines,
--   Sound & Light Co accepts) so the escalation trail is visible in the UI.
--
--   Every statement is idempotent (NOT EXISTS guards) so the migration is safe
--   to re-run on an existing database.
-- ============================================================================

-- The demo client is id 3 (seeded by V3). Resolve it by query rather than
-- hard-coding a raw id so the insert stays correct regardless of the runtime
-- sequence value.
-- ----------------------------------------------------------------------------

-- ==== Additional AV vendors (ranked list for escalation) ====
INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Sound & Light Co', 'av', 'Audio, lighting, and staging services.', '0911000201', 'sound.light@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Sound & Light Co');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Stage Pro', 'av', 'Stage design and rigging services.', '0911000202', 'stage.pro@example.com', 3, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Stage Pro');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'AV Solutions', 'av', 'Full-service AV production.', '0911000203', 'av.solutions@example.com', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'AV Solutions');

-- ==== Additional security vendors ====
INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Guardian Security', 'security', 'Professional event security and crowd control.', '0911000204', 'guardian.security@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Guardian Security');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'SafeCity Security', 'security', 'Venue access control and event guarding.', '0911000205', 'safecity.security@example.com', 3, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'SafeCity Security');

-- ==== Additional vendors for other common categories ====
INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Sparkle Cleaners', 'cleaning', 'Event cleanup and sanitation services.', '0911000206', 'sparkle.cleaners@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Sparkle Cleaners');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Habesha Photography', 'photography', 'Event photography and coverage.', '0911000207', 'habesha.photo@example.com', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Habesha Photography');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'DJ Yared', 'music', 'DJ and live event sound services.', '0911000208', 'dj.yared@example.com', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'DJ Yared');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Gourmet Catering', 'catering', 'Catering and banquet services.', '0911000209', 'gourmet.catering@example.com', 3, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Gourmet Catering');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'RegDesk', 'registration', 'Guest registration and badge printing.', '0911000210', 'regdesk@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'RegDesk');

-- ==== Demo inquiry for the escalation showcase event ====
INSERT INTO inquiries (client_id, client_name, event_type, event_date, expected_attendees, requirements, requested_categories, status)
SELECT (SELECT id FROM users WHERE id = 3 AND role = 'CLIENT'),
       'Demo Client',
       'gala',
       '2027-03-20',
       300,
       'Demo seed inquiry: Escalation Showcase vendor coordination.',
       '[\"av\",\"security\"]',
       'PROPOSAL_ACCEPTED'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 3 AND role = 'CLIENT')
  AND NOT EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: Escalation Showcase vendor coordination.');

-- ==== Demo event: Escalation Showcase ====
INSERT INTO events (inquiry_id, name, status, venue, venue_id, unfilled_categories, required_categories)
SELECT (SELECT id FROM inquiries WHERE requirements = 'Demo seed inquiry: Escalation Showcase vendor coordination.'),
       'Escalation Showcase',
       'CONFIRMED',
       'Main Hall A',
       (SELECT id FROM venues WHERE name = 'Main Hall A'),
       NULL,
       '[\"av\",\"security\"]'
WHERE EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: Escalation Showcase vendor coordination.')
  AND EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A')
  AND NOT EXISTS (SELECT 1 FROM events WHERE name = 'Escalation Showcase');

-- ==== Escalation chain: AV category ====
-- 1st attempt: Elite AV (top-ranked) declines.
INSERT INTO vendor_assignments (event_id, vendor_id, vendor_name, service_category, status, assigned_at, responded_at, decline_reason, selection_reason, ranking_score)
SELECT (SELECT id FROM events WHERE name = 'Escalation Showcase'),
       (SELECT id FROM vendors WHERE company_name = 'Elite AV'), 'Elite AV', 'av', 'DECLINED', NOW(), NOW(), 'Scheduling conflict on the event date.', 'TOP_RATED', 0.92
WHERE EXISTS (SELECT 1 FROM events WHERE name = 'Escalation Showcase')
  AND EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Elite AV')
  AND NOT EXISTS (
    SELECT 1 FROM vendor_assignments
    WHERE event_id = (SELECT id FROM events WHERE name = 'Escalation Showcase')
      AND vendor_id = (SELECT id FROM vendors WHERE company_name = 'Elite AV')
      AND service_category = 'av'
      AND status = 'DECLINED'
  );

-- 2nd attempt: escalation to next-ranked eligible vendor -> accepted.
INSERT INTO vendor_assignments (event_id, vendor_id, vendor_name, service_category, status, assigned_at, responded_at, selection_reason, ranking_score)
SELECT (SELECT id FROM events WHERE name = 'Escalation Showcase'),
       (SELECT id FROM vendors WHERE company_name = 'Sound & Light Co'), 'Sound & Light Co', 'av', 'ACCEPTED', NOW(), NOW(), 'LEAST_LOADED', 0.81
WHERE EXISTS (SELECT 1 FROM events WHERE name = 'Escalation Showcase')
  AND EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Sound & Light Co')
  AND NOT EXISTS (
    SELECT 1 FROM vendor_assignments
    WHERE event_id = (SELECT id FROM events WHERE name = 'Escalation Showcase')
      AND vendor_id = (SELECT id FROM vendors WHERE company_name = 'Sound & Light Co')
      AND service_category = 'av'
      AND status = 'ACCEPTED'
  );

-- ==== Escalation chain: Security category ====
-- 1st attempt: Addis Security Pro declines.
INSERT INTO vendor_assignments (event_id, vendor_id, vendor_name, service_category, status, assigned_at, responded_at, decline_reason, selection_reason, ranking_score)
SELECT (SELECT id FROM events WHERE name = 'Escalation Showcase'),
       (SELECT id FROM vendors WHERE company_name = 'Addis Security Pro'), 'Addis Security Pro', 'security', 'DECLINED', NOW(), NOW(), 'Team already booked.', 'TOP_RATED', 0.90
WHERE EXISTS (SELECT 1 FROM events WHERE name = 'Escalation Showcase')
  AND EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Addis Security Pro')
  AND NOT EXISTS (
    SELECT 1 FROM vendor_assignments
    WHERE event_id = (SELECT id FROM events WHERE name = 'Escalation Showcase')
      AND vendor_id = (SELECT id FROM vendors WHERE company_name = 'Addis Security Pro')
      AND service_category = 'security'
      AND status = 'DECLINED'
  );

-- 2nd attempt: escalation to next-ranked eligible vendor -> accepted.
INSERT INTO vendor_assignments (event_id, vendor_id, vendor_name, service_category, status, assigned_at, responded_at, selection_reason, ranking_score)
SELECT (SELECT id FROM events WHERE name = 'Escalation Showcase'),
       (SELECT id FROM vendors WHERE company_name = 'Guardian Security'), 'Guardian Security', 'security', 'ACCEPTED', NOW(), NOW(), 'LEAST_LOADED', 0.84
WHERE EXISTS (SELECT 1 FROM events WHERE name = 'Escalation Showcase')
  AND EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Guardian Security')
  AND NOT EXISTS (
    SELECT 1 FROM vendor_assignments
    WHERE event_id = (SELECT id FROM events WHERE name = 'Escalation Showcase')
      AND vendor_id = (SELECT id FROM vendors WHERE company_name = 'Guardian Security')
      AND service_category = 'security'
      AND status = 'ACCEPTED'
  );
