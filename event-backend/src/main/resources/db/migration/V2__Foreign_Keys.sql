-- All FKs except vendor→user are declared inline in V1__create_initial_schema.sql.
-- The vendors.user_id FK is the only one genuinely added here, because V1's
-- vendors table predates the users FK. Everything else is a no-op.
ALTER TABLE vendors ADD CONSTRAINT fk_vendor_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;