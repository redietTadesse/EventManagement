ALTER TABLE venues ADD COLUMN resources TEXT NULL;

CREATE TABLE venue_unavailable_dates (
    id BIGINT NOT NULL AUTO_INCREMENT,
    venue_id BIGINT NOT NULL,
    unavailable_date DATE NOT NULL,
    reason VARCHAR(500) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_venue_unavailable_date UNIQUE (venue_id, unavailable_date),
    CONSTRAINT fk_venue_unavailable_date_venue FOREIGN KEY (venue_id) REFERENCES venues(id)
);

CREATE INDEX idx_venue_unavailable_date ON venue_unavailable_dates (unavailable_date);
