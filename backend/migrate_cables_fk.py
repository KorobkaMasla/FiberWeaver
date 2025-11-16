"""
Migration script to add cable_type_id as FK to cable_types table
"""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "test.db"

def migrate_db():
    """Apply FK migration to cables table"""
    
    if not DB_PATH.exists():
        print(f"✗ Database not found at {DB_PATH}")
        return False
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        print("Starting migration...")
        print(f"Database: {DB_PATH}")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Current tables: {', '.join(tables)}")
        
        has_cable_types = 'cable_types' in tables
        has_cabel_types = 'cabel_types' in tables
        
        if not has_cable_types and not has_cabel_types:
            print("✗ Neither cable_types nor cabel_types table found")
            return False
        
        target_table = 'cable_types' if has_cable_types else 'cabel_types'
        print(f"✓ Found target table: {target_table}")
        
        cursor.execute("PRAGMA foreign_keys = OFF;")
        print("✓ Foreign keys disabled")
        
        if 'cables' not in tables:
            print("✗ cables table not found")
            return False
        
        cursor.execute("PRAGMA table_info(cables)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        print(f"Cables columns: {', '.join(columns.keys())}")
        
        if 'cable_type_id' in columns:
            print("✓ cable_type_id column already exists")
        else:
            print("Adding cable_type_id column...")
            cursor.execute("ALTER TABLE cables ADD COLUMN cable_type_id INTEGER DEFAULT 1;")
            print("✓ Added cable_type_id column")
        
        cursor.execute("ALTER TABLE cables RENAME TO cables_old;")
        print("✓ Renamed cables → cables_old")
        
        create_sql = f"""
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
                REFERENCES {target_table} (cable_type_id),
            CONSTRAINT FK_cables_network_objects_from FOREIGN KEY (from_object_id)
                REFERENCES network_objects (network_object_id),
            CONSTRAINT FK_cables_network_objects_to FOREIGN KEY (to_object_id)
                REFERENCES network_objects (network_object_id)
        );
        """
        cursor.execute(create_sql)
        print("✓ Created new cables table with FK constraints")
        
        copy_sql = """
        INSERT INTO cables (cable_id, name, fiber_count, from_object_id, to_object_id, distance_km, description, created_at, updated_at, cable_type_id)
        SELECT cable_id, name, 
               COALESCE(fiber_count, 12) as fiber_count,
               from_object_id, to_object_id, distance_km, description, created_at, updated_at, 
               COALESCE(cable_type_id, 1) as cable_type_id
        FROM cables_old;
        """
        cursor.execute(copy_sql)
        row_count = cursor.rowcount
        print(f"✓ Copied {row_count} cables")
        
        cursor.execute("DROP TABLE cables_old;")
        print("✓ Dropped cables_old table")
        
        cursor.execute("PRAGMA foreign_keys = ON;")
        print("✓ Foreign keys re-enabled")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = migrate_db()
    sys.exit(0 if success else 1)
