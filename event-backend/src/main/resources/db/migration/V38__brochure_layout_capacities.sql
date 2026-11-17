-- Structured capacities from the AICC brochure. Unknown layouts remain unset.
UPDATE venues SET layout_capacities = '{"THEATRE":4200,"CLASSROOM":1509,"BANQUET":2400,"CABARET":1680}' WHERE name = 'Multipurpose I' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":4000,"CLASSROOM":1548,"BANQUET":2500,"CABARET":1750}' WHERE name = 'Multipurpose II' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":144,"CLASSROOM":64,"BANQUET":100,"CABARET":70}' WHERE name = 'Meeting Room 01' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":168,"CLASSROOM":68,"BANQUET":100,"CABARET":70}' WHERE name = 'Meeting Room 02' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":288,"CLASSROOM":132,"BANQUET":250,"CABARET":175}' WHERE name = 'Meeting Room 03' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":189,"CLASSROOM":88,"BANQUET":140,"CABARET":98}' WHERE name = 'Meeting Room 04' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":483,"CLASSROOM":200,"BANQUET":360,"CABARET":252}' WHERE name = 'Meeting Room 05' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":264,"CLASSROOM":132,"BANQUET":200,"CABARET":140}' WHERE name = 'Meeting Room 06' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":264,"CLASSROOM":132,"BANQUET":200,"CABARET":140}' WHERE name = 'Meeting Room 07' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":716,"CLASSROOM":376,"BANQUET":620,"CABARET":434}' WHERE name = 'Meeting Room 08' AND layout_capacities IS NULL;
UPDATE venues SET layout_capacities = '{"THEATRE":2200,"CLASSROOM":1000,"BANQUET":1500,"CABARET":1050}' WHERE name = 'Meeting Room 02 - 07' AND layout_capacities IS NULL;
