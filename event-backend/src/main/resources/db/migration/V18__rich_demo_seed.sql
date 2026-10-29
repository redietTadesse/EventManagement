-- Rich demo data for vendor assignment, inquiry workflow, and multi-day venue booking.
-- Client id 3 is the demo client seeded by V3; resolve it through a query so no
-- foreign key value is tied to an auto-increment assumption in the inserts below.

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Elite AV', 'av', 'Audio, lighting, and staging services.', '0911000101', 'elite.av@example.com', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Elite AV');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Addis Security Pro', 'security', 'Professional event security services.', '0911000102', 'addis.security@example.com', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Addis Security Pro');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Sparkle Cleaners', 'cleaning', 'Event cleanup and sanitation services.', '0911000103', 'sparkle.cleaners@example.com', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Sparkle Cleaners');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'Habesha Photography', 'photography', 'Event photography and coverage.', '0911000104', 'habesha.photo@example.com', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Habesha Photography');

INSERT INTO vendors (company_name, service_category, description, phone, email, rating, is_active)
SELECT 'DJ Yared', 'music', 'DJ and live event sound services.', '0911000105', 'dj.yared@example.com', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_name = 'DJ Yared');

-- Five inquiries for the demo client (the seeded client is id 3).
INSERT INTO inquiries (client_id, client_name, event_type, event_date, expected_attendees, requirements, requested_categories, status)
SELECT (SELECT id FROM users WHERE id = 3 AND role = 'CLIENT'),
       (SELECT COALESCE(full_name, 'Demo Client') FROM users WHERE id = 3 AND role = 'CLIENT'),
       'gala', '2027-01-20', 450, 'Demo seed inquiry: AICC Tech Gala vendor coordination.', '["av","security"]', 'PROPOSAL_ACCEPTED'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 3 AND role = 'CLIENT')
  AND NOT EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: AICC Tech Gala vendor coordination.');

INSERT INTO inquiries (client_id, client_name, event_type, event_date, expected_attendees, requirements, requested_categories, status)
SELECT (SELECT id FROM users WHERE id = 3 AND role = 'CLIENT'),
       (SELECT COALESCE(full_name, 'Demo Client') FROM users WHERE id = 3 AND role = 'CLIENT'),
       'concert', '2027-01-28', 1200, 'Demo seed inquiry: Charity Concert vendor coordination.', '["av","security","music"]', 'PROPOSAL_ACCEPTED'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 3 AND role = 'CLIENT')
  AND NOT EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: Charity Concert vendor coordination.');

INSERT INTO inquiries (client_id, client_name, event_type, event_date, expected_attendees, requirements, requested_categories, status)
SELECT (SELECT id FROM users WHERE id = 3 AND role = 'CLIENT'),
       (SELECT COALESCE(full_name, 'Demo Client') FROM users WHERE id = 3 AND role = 'CLIENT'),
       'conference', '2027-01-11', 180, 'Demo seed inquiry: Addis regional conference.', '["av","catering","security"]', 'INQUIRY_SUBMITTED'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 3 AND role = 'CLIENT')
  AND NOT EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: Addis regional conference.');

INSERT INTO inquiries (client_id, client_name, event_type, event_date, expected_attendees, requirements, requested_categories, status)
SELECT (SELECT id FROM users WHERE id = 3 AND role = 'CLIENT'),
       (SELECT COALESCE(full_name, 'Demo Client') FROM users WHERE id = 3 AND role = 'CLIENT'),
       'wedding', '2027-01-15', 300, 'Demo seed inquiry: Ethiopian wedding expo.', '["catering","photography","music"]', 'PROPOSAL_SENT'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 3 AND role = 'CLIENT')
  AND NOT EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: Ethiopian wedding expo.');

INSERT INTO inquiries (client_id, client_name, event_type, event_date, end_date, expected_attendees, requirements, requested_categories, status)
SELECT (SELECT id FROM users WHERE id = 3 AND role = 'CLIENT'),
       (SELECT COALESCE(full_name, 'Demo Client') FROM users WHERE id = 3 AND role = 'CLIENT'),
       'exhibition', '2027-02-10', '2027-02-14', 2500,
       'Demo seed inquiry: Big 5 Construct Ethiopia multi-day exhibition.', '["av","security","cleaning"]', 'PROPOSAL_ACCEPTED'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 3 AND role = 'CLIENT')
  AND NOT EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: Big 5 Construct Ethiopia multi-day exhibition.');

-- Create two events from accepted demo inquiries.
INSERT INTO events (inquiry_id, name, status, unfilled_categories, required_categories)
SELECT (SELECT id FROM inquiries WHERE requirements = 'Demo seed inquiry: AICC Tech Gala vendor coordination.'),
       'AICC Tech Gala', 'NEEDS_COORDINATOR', 'av,security', '["av","security"]'
WHERE EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: AICC Tech Gala vendor coordination.')
  AND NOT EXISTS (SELECT 1 FROM events WHERE name = 'AICC Tech Gala');

INSERT INTO events (inquiry_id, name, status, unfilled_categories, required_categories)
SELECT (SELECT id FROM inquiries WHERE requirements = 'Demo seed inquiry: Charity Concert vendor coordination.'),
       'Charity Concert', 'AWAITING_VENDORS', 'av,security,music', '["av","security","music"]'
WHERE EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: Charity Concert vendor coordination.')
  AND NOT EXISTS (SELECT 1 FROM events WHERE name = 'Charity Concert');

-- Record two declined vendor attempts for AICC Tech Gala.
INSERT INTO vendor_assignments (event_id, vendor_id, vendor_name, service_category, status, assigned_at, responded_at, decline_reason)
SELECT (SELECT id FROM events WHERE name = 'AICC Tech Gala'),
       (SELECT id FROM vendors WHERE company_name = 'Elite AV'), 'Elite AV', 'av', 'DECLINED', NOW(), NOW(), 'Unavailable on the event date.'
WHERE EXISTS (SELECT 1 FROM events WHERE name = 'AICC Tech Gala')
  AND EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Elite AV')
  AND NOT EXISTS (
    SELECT 1 FROM vendor_assignments
    WHERE event_id = (SELECT id FROM events WHERE name = 'AICC Tech Gala')
      AND vendor_id = (SELECT id FROM vendors WHERE company_name = 'Elite AV')
      AND status = 'DECLINED'
  );

INSERT INTO vendor_assignments (event_id, vendor_id, vendor_name, service_category, status, assigned_at, responded_at, decline_reason)
SELECT (SELECT id FROM events WHERE name = 'AICC Tech Gala'),
       (SELECT id FROM vendors WHERE company_name = 'Addis Security Pro'), 'Addis Security Pro', 'security', 'DECLINED', NOW(), NOW(), 'Team is already booked.'
WHERE EXISTS (SELECT 1 FROM events WHERE name = 'AICC Tech Gala')
  AND EXISTS (SELECT 1 FROM vendors WHERE company_name = 'Addis Security Pro')
  AND NOT EXISTS (
    SELECT 1 FROM vendor_assignments
    WHERE event_id = (SELECT id FROM events WHERE name = 'AICC Tech Gala')
      AND vendor_id = (SELECT id FROM vendors WHERE company_name = 'Addis Security Pro')
      AND status = 'DECLINED'
  );

-- An OPEN assignment has no vendor attached yet.
INSERT INTO vendor_assignments (event_id, vendor_id, vendor_name, service_category, status)
SELECT (SELECT id FROM events WHERE name = 'Charity Concert'), NULL, NULL, 'music', 'OPEN'
WHERE EXISTS (SELECT 1 FROM events WHERE name = 'Charity Concert')
  AND NOT EXISTS (
    SELECT 1 FROM vendor_assignments
    WHERE event_id = (SELECT id FROM events WHERE name = 'Charity Concert')
      AND status = 'OPEN' AND service_category = 'music' AND vendor_id IS NULL
  );

-- Convert the accepted exhibition inquiry into an event at Main Hall A.
INSERT INTO events (inquiry_id, name, status, venue, venue_id, unfilled_categories, required_categories)
SELECT (SELECT id FROM inquiries WHERE requirements = 'Demo seed inquiry: Big 5 Construct Ethiopia multi-day exhibition.'),
       'Big 5 Construct Ethiopia', 'AWAITING_VENDORS', 'Main Hall A',
       (SELECT id FROM venues WHERE name = 'Main Hall A'), 'av,security,cleaning', '["av","security","cleaning"]'
WHERE EXISTS (SELECT 1 FROM inquiries WHERE requirements = 'Demo seed inquiry: Big 5 Construct Ethiopia multi-day exhibition.')
  AND EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A')
  AND NOT EXISTS (SELECT 1 FROM events WHERE name = 'Big 5 Construct Ethiopia');

-- Reserve one setup day, all five event days, and one teardown day (Feb 9–15).
INSERT INTO venue_bookings (venue_id, event_id, booking_date, status)
SELECT (SELECT id FROM venues WHERE name = 'Main Hall A'),
       (SELECT id FROM events WHERE name = 'Big 5 Construct Ethiopia'), '2027-02-09', 'CONFIRMED'
WHERE EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A')
  AND EXISTS (SELECT 1 FROM events WHERE name = 'Big 5 Construct Ethiopia')
  AND NOT EXISTS (SELECT 1 FROM venue_bookings WHERE venue_id = (SELECT id FROM venues WHERE name = 'Main Hall A') AND booking_date = '2027-02-09');

INSERT INTO venue_bookings (venue_id, event_id, booking_date, status)
SELECT (SELECT id FROM venues WHERE name = 'Main Hall A'),
       (SELECT id FROM events WHERE name = 'Big 5 Construct Ethiopia'), '2027-02-10', 'CONFIRMED'
WHERE EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A')
  AND EXISTS (SELECT 1 FROM events WHERE name = 'Big 5 Construct Ethiopia')
  AND NOT EXISTS (SELECT 1 FROM venue_bookings WHERE venue_id = (SELECT id FROM venues WHERE name = 'Main Hall A') AND booking_date = '2027-02-10');

INSERT INTO venue_bookings (venue_id, event_id, booking_date, status)
SELECT (SELECT id FROM venues WHERE name = 'Main Hall A'),
       (SELECT id FROM events WHERE name = 'Big 5 Construct Ethiopia'), '2027-02-11', 'CONFIRMED'
WHERE EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A')
  AND EXISTS (SELECT 1 FROM events WHERE name = 'Big 5 Construct Ethiopia')
  AND NOT EXISTS (SELECT 1 FROM venue_bookings WHERE venue_id = (SELECT id FROM venues WHERE name = 'Main Hall A') AND booking_date = '2027-02-11');

INSERT INTO venue_bookings (venue_id, event_id, booking_date, status)
SELECT (SELECT id FROM venues WHERE name = 'Main Hall A'),
       (SELECT id FROM events WHERE name = 'Big 5 Construct Ethiopia'), '2027-02-12', 'CONFIRMED'
WHERE EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A')
  AND EXISTS (SELECT 1 FROM events WHERE name = 'Big 5 Construct Ethiopia')
  AND NOT EXISTS (SELECT 1 FROM venue_bookings WHERE venue_id = (SELECT id FROM venues WHERE name = 'Main Hall A') AND booking_date = '2027-02-12');

INSERT INTO venue_bookings (venue_id, event_id, booking_date, status)
SELECT (SELECT id FROM venues WHERE name = 'Main Hall A'),
       (SELECT id FROM events WHERE name = 'Big 5 Construct Ethiopia'), '2027-02-13', 'CONFIRMED'
WHERE EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A')
  AND EXISTS (SELECT 1 FROM events WHERE name = 'Big 5 Construct Ethiopia')
  AND NOT EXISTS (SELECT 1 FROM venue_bookings WHERE venue_id = (SELECT id FROM venues WHERE name = 'Main Hall A') AND booking_date = '2027-02-13');

INSERT INTO venue_bookings (venue_id, event_id, booking_date, status)
SELECT (SELECT id FROM venues WHERE name = 'Main Hall A'),
       (SELECT id FROM events WHERE name = 'Big 5 Construct Ethiopia'), '2027-02-14', 'CONFIRMED'
WHERE EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A')
  AND EXISTS (SELECT 1 FROM events WHERE name = 'Big 5 Construct Ethiopia')
  AND NOT EXISTS (SELECT 1 FROM venue_bookings WHERE venue_id = (SELECT id FROM venues WHERE name = 'Main Hall A') AND booking_date = '2027-02-14');

INSERT INTO venue_bookings (venue_id, event_id, booking_date, status)
SELECT (SELECT id FROM venues WHERE name = 'Main Hall A'),
       (SELECT id FROM events WHERE name = 'Big 5 Construct Ethiopia'), '2027-02-15', 'CONFIRMED'
WHERE EXISTS (SELECT 1 FROM venues WHERE name = 'Main Hall A')
  AND EXISTS (SELECT 1 FROM events WHERE name = 'Big 5 Construct Ethiopia')
  AND NOT EXISTS (SELECT 1 FROM venue_bookings WHERE venue_id = (SELECT id FROM venues WHERE name = 'Main Hall A') AND booking_date = '2027-02-15');
