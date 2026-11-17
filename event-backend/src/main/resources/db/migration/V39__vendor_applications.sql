CREATE TABLE vendor_applications (
                                     id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                     company_name VARCHAR(255) NOT NULL,
                                     contact_person VARCHAR(100) NOT NULL,
                                     email VARCHAR(100) NOT NULL,
                                     phone VARCHAR(20) NOT NULL,
                                     service_category VARCHAR(100) NOT NULL,
                                     description TEXT,
                                     website VARCHAR(255),
                                     established_year INT,
                                     username VARCHAR(60) NOT NULL,
                                     password_hash VARCHAR(255) NOT NULL,
                                     status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                                     review_note VARCHAR(500),
                                     reviewed_by BIGINT,
                                     reviewed_at DATETIME,
                                     vendor_id BIGINT,
                                     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_applications_status ON vendor_applications (status);
CREATE INDEX idx_vendor_applications_email ON vendor_applications (email);