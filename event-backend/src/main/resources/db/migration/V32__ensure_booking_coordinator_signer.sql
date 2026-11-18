-- Repair databases created before coordinator_signed_by was added to V27.
-- Fresh databases already have the column, so this migration is a no-op there.
SET @booking_signer_missing = (
    SELECT COUNT(*) = 0
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'booking_agreements'
      AND column_name = 'coordinator_signed_by'
);
SET @booking_signer_sql = IF(
    @booking_signer_missing,
    'ALTER TABLE booking_agreements ADD COLUMN coordinator_signed_by BIGINT NULL',
    'SELECT 1'
);
PREPARE booking_signer_statement FROM @booking_signer_sql;
EXECUTE booking_signer_statement;
DEALLOCATE PREPARE booking_signer_statement;
