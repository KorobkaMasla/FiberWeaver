-- Add cable_type_id column if not exists and create FK constraint
-- This migration adds the foreign key relationship between cables and cabel_types

-- First, check if cable_type_id column exists, if not add it
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we'll handle this in code

-- Add the FK constraint (note: SQLite has limitations with ALTER TABLE ADD CONSTRAINT)
-- We need to recreate the table or use PRAGMA foreign_keys OFF during migration

PRAGMA foreign_keys = OFF;

-- Rename old cables table
ALTER TABLE cables RENAME TO cables_old;

-- Create new cables table with FK
CREATE TABLE cables (
    cable_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    fiber_count    INTEGER,
    from_object_id INTEGER NOT NULL,
    to_object_id   INTEGER NOT NULL,
    distance_km    REAL,
    description    TEXT,
    created_at     TEXT    DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
    updated_at     TEXT,
    cable_type_id  INTEGER NOT NULL,
    CONSTRAINT FK_cables_cable_types FOREIGN KEY (cable_type_id)
        REFERENCES cabel_types (cabel_type_id),
    CONSTRAINT FK_cables_network_objects FOREIGN KEY (to_object_id)
        REFERENCES network_objects (network_object_id),
    CONSTRAINT FK_cables_network_objects_2 FOREIGN KEY (from_object_id)
        REFERENCES network_objects (network_object_id)
);

-- Copy data from old table to new table
-- Note: cable_type is currently a string, need to map to cable_type_id
-- For now, default to cable_type_id = 1 (ОКГ-1), you may need to adjust based on your data
INSERT INTO cables (cable_id, name, fiber_count, from_object_id, to_object_id, distance_km, description, created_at, updated_at, cable_type_id)
SELECT cable_id, name, fiber_count, from_object_id, to_object_id, distance_km, description, created_at, updated_at, 
       CASE 
           WHEN fiber_count = 1 THEN 1
           WHEN fiber_count = 2 THEN 2
           WHEN fiber_count = 4 THEN 3
           WHEN fiber_count = 8 THEN 4
           WHEN fiber_count = 12 THEN 5
           WHEN fiber_count = 24 THEN 6
           WHEN fiber_count = 48 THEN 7
           WHEN fiber_count = 96 THEN 8
           ELSE 5  -- Default to ОКГ-12
       END
FROM cables_old;

-- Drop old table
DROP TABLE cables_old;

PRAGMA foreign_keys = ON;
