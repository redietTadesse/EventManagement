CREATE TABLE availability_watches (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    inquiry_id BIGINT NOT NULL UNIQUE,
    client_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    notified_at DATETIME(6),
    next_check_at DATETIME(6) NOT NULL,
    matched_venue_id BIGINT,
    matched_venue_name VARCHAR(255),
    CONSTRAINT fk_watch_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE,
    CONSTRAINT fk_watch_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX ix_watch_due (status, next_check_at)
);
