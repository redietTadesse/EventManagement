CREATE TABLE booking_agreements (
    inquiry_id BIGINT NOT NULL PRIMARY KEY,
    terms_snapshot TEXT NOT NULL,
    client_signature VARCHAR(255),
    client_signed_at DATETIME(6),
    coordinator_signature VARCHAR(255),
    coordinator_signed_at DATETIME(6),
    coordinator_signed_by BIGINT,
    receipt MEDIUMBLOB,
    receipt_type VARCHAR(255),
    receipt_uploaded_at DATETIME(6),
    rejection_reason VARCHAR(1000),
    verified_by BIGINT,
    verified_at DATETIME(6),
    CONSTRAINT fk_booking_agreement_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE
);
