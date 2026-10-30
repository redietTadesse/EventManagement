ALTER TABLE vendors
    MODIFY COLUMN rating DECIMAL(3,1) NULL;

UPDATE vendors v
SET rating = COALESCE(
    (
        SELECT ROUND(AVG(va.vendor_rating), 1)
        FROM vendor_assignments va
        WHERE va.vendor_id = v.id
          AND va.status = 'COMPLETED'
          AND va.vendor_rating IS NOT NULL
    ),
    0.0
);
