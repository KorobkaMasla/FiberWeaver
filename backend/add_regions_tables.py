"""
Migration script to add Region tables to existing database
Run this script to update existing SQLite database with region support
"""

import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "test.db"


def migrate_db():
    """Create region tables if they don't exist"""
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        return False

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS regions (
                region_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                display_name TEXT,
                country TEXT,
                state TEXT,
                nominatim_id INTEGER UNIQUE,
                description TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT
            )
        """)
        print("✓ Created regions table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS region_objects (
                region_id INTEGER NOT NULL,
                network_object_id INTEGER NOT NULL,
                PRIMARY KEY (region_id, network_object_id),
                FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE,
                FOREIGN KEY (network_object_id) REFERENCES network_objects(network_object_id) ON DELETE CASCADE
            )
        """)
        print("✓ Created region_objects table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS region_cables (
                region_id INTEGER NOT NULL,
                cable_id INTEGER NOT NULL,
                PRIMARY KEY (region_id, cable_id),
                FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE,
                FOREIGN KEY (cable_id) REFERENCES cables(cable_id) ON DELETE CASCADE
            )
        """)
        print("✓ Created region_cables table")

        cursor.execute("CREATE INDEX IF NOT EXISTS ix_regions_id ON regions (region_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_regions_name ON regions (name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_regions_nominatim_id ON regions (nominatim_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_region_objects_region_id ON region_objects (region_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_region_objects_object_id ON region_objects (network_object_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_region_cables_region_id ON region_cables (region_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_region_cables_cable_id ON region_cables (cable_id)")
        print("✓ Created all indexes")

        conn.commit()
        print("\n✓ Migration completed successfully!")
        return True

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Error during migration: {e}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_db()
