-- Gives the V46 test vendors a valid insurance expiry date so eligibility checks don't skip them.
-- The Vendor entity reads this marker from the end of description and hides it from the public text.
UPDATE vendors
SET description = CONCAT(description, CHAR(10), '[insurance-expiry:2027-12-31]')
WHERE company_name IN ('Test Catering Co', 'Test Banquets')
  AND description NOT LIKE '%[insurance-expiry:%';