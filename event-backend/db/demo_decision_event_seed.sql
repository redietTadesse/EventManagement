-- Optional local/demo data only. This is intentionally not a Flyway migration.
-- Enriches the V18 AICC Tech Gala demo with a resolved AV category, an exhausted
-- security category, an excluded insurance-expired candidate, and a tight venue fit.

START TRANSACTION;

INSERT INTO vendors (
    user_id, company_name, service_category, description, email, rating, is_active
)
SELECT NULL, 'Demo Security - Insurance Expired', 'security',
       CONCAT('Demo candidate for the AICC Tech Gala scenario.', '\n[insurance-expiry:2027-01-19]'),
       'demo.insurance.security@example.test', 4.0, 1
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE company_name = 'Demo Security - Insurance Expired'
);

INSERT INTO vendor_assignments (
    event_id, vendor_id, vendor_name, service_category, status,
    assigned_at, responded_at, selection_reason, decision_snapshot
)
SELECT e.id, v.id, v.company_name, 'av', 'ACCEPTED', NOW(), NOW(),
       'COORDINATOR_MANUAL',
       JSON_OBJECT(
           'category', 'av',
           'eventDate', DATE_FORMAT(i.event_date, '%Y-%m-%d'),
           'selectedVendorId', v.id,
           'selectedVendorName', v.company_name,
           'selectionReason', 'COORDINATOR_MANUAL',
           'reasoning', 'Demo scenario: the coordinator manually selected AV Solutions after the first AV offer was declined.',
           'actor', JSON_OBJECT(
               'userId', (SELECT id FROM users WHERE username = 'coordinator' LIMIT 1),
               'username', 'coordinator'
           ),
           'considered', JSON_ARRAY(JSON_OBJECT(
               'vendorId', v.id,
               'vendorName', v.company_name,
               'score', NULL,
               'rank', NULL,
               'status', 'Selected',
               'reason', 'Demo coordinator override after a declined offer.'
           )),
           'excluded', JSON_ARRAY()
       )
FROM events e
JOIN inquiries i ON i.id = e.inquiry_id
JOIN vendors v ON v.company_name = 'AV Solutions' AND v.service_category = 'av'
WHERE e.name = 'AICC Tech Gala'
  AND i.requirements = 'Demo seed inquiry: AICC Tech Gala vendor coordination.'
  AND NOT EXISTS (
      SELECT 1 FROM vendor_assignments existing
      WHERE existing.event_id = e.id
        AND existing.service_category = 'av'
        AND existing.status IN ('ACCEPTED', 'COMPLETED')
  );

UPDATE events e
JOIN inquiries i ON i.id = e.inquiry_id
JOIN venues v ON v.name = 'Main Hall A'
SET e.venue = v.name,
    e.venue_id = v.id,
    e.unfilled_categories = 'security'
WHERE e.name = 'AICC Tech Gala'
  AND i.requirements = 'Demo seed inquiry: AICC Tech Gala vendor coordination.'
  AND e.status = 'NEEDS_COORDINATOR';

COMMIT;
