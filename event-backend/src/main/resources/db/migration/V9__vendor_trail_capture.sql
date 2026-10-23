-- Vendor trail capture.
--
-- ranking_score and selection_reason are written at decision time. They are never
-- recomputed: the ranking depends on the candidate set and each vendor's workload
-- at that instant, so a replay would not reproduce the decision that was acted on.
ALTER TABLE vendor_assignments
    ADD COLUMN ranking_score DOUBLE NULL,
    ADD COLUMN selection_reason VARCHAR(40) NULL,
    ADD COLUMN expires_at DATETIME NULL;

-- An OPEN assignment is an offer to the whole pool and has no vendor yet. Allowing
-- NULL here is what lets the exhaustion path insert a fresh pool row instead of
-- recycling the declining vendor's row and erasing their decline.
ALTER TABLE vendor_assignments
    MODIFY COLUMN vendor_id BIGINT NULL,
    MODIFY COLUMN vendor_name VARCHAR(255) NULL;