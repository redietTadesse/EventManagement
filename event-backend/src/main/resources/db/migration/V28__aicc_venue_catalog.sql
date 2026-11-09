-- AICC brochure venue catalog. The searchable capacity uses the theatre layout.
-- Keep the combined room inactive so it cannot overlap its component rooms.
INSERT IGNORE INTO venues
    (name, description, capacity, location, is_active, setup_buffer_days, teardown_buffer_days)
VALUES
    ('Multipurpose I', '4535 m². 254 booths (9 m² each). Seats: theatre 4200, classroom 1509, banquet 2400, cabaret 1680.', 4200, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Multipurpose II', '4205 m². 250 booths (9 m² each). Seats: theatre 4000, classroom 1548, banquet 2500, cabaret 1750.', 4000, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Meeting Room 01', '178.3 m². 10 booths (9 m² each). Seats: theatre 144, classroom 64, banquet 100, cabaret 70.', 144, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Meeting Room 02', '214 m². 10 booths (9 m² each). Seats: theatre 168, classroom 68, banquet 100, cabaret 70.', 168, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Meeting Room 03', '335 m². 18 booths (9 m² each). Seats: theatre 288, classroom 132, banquet 250, cabaret 175.', 288, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Meeting Room 04', '250 m². 10 booths (9 m² each). Seats: theatre 189, classroom 88, banquet 140, cabaret 98.', 189, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Meeting Room 05', '497 m². 28 booths (9 m² each). Seats: theatre 483, classroom 200, banquet 360, cabaret 252.', 483, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Meeting Room 06', '313 m². 18 booths (9 m² each). Seats: theatre 264, classroom 132, banquet 200, cabaret 140.', 264, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Meeting Room 07', '310 m². 18 booths (9 m² each). Seats: theatre 264, classroom 132, banquet 200, cabaret 140.', 264, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Meeting Room 08', '935 m². 50 booths (9 m² each). Seats: theatre 716, classroom 376, banquet 620, cabaret 434.', 716, 'AICC, Addis Ababa', TRUE, 1, 1),
    ('Meeting Room 02 - 07', '2187 m². 123 booths (9 m² each). Seats: theatre 2200, classroom 1000, banquet 1500, cabaret 1050. Combined configuration of Rooms 02–07; keep inactive while individual rooms are bookable.', 2200, 'AICC, Addis Ababa', FALSE, 1, 1);
