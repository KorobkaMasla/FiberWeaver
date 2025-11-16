"""
Migration: Add object_type_id column to network_objects and link to object_types
Also removes the old object_type column
"""
import sqlite3
import os

db_path = "test.db"

if not os.path.exists(db_path):
    print(f"Database file not found: {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(network_objects)")
    columns = {col[1]: col[2] for col in cursor.fetchall()}
    
    if 'object_type_id' not in columns:
        print("Adding object_type_id column...")
        cursor.execute("ALTER TABLE network_objects ADD COLUMN object_type_id INTEGER")
        
        # Populate object_type_id based on object_type name match
        cursor.execute("""
            UPDATE network_objects
            SET object_type_id = (
                SELECT object_type_id FROM object_types 
                WHERE object_types.name = network_objects.object_type
                LIMIT 1
            )
        """)
        
        print("Removing old object_type column...")
        # SQLite doesn't support direct DROP COLUMN, so we need to recreate the table
        # Get the current schema
        cursor.execute("""
            SELECT sql FROM sqlite_master 
            WHERE type='table' AND name='network_objects'
        """)
        create_sql = cursor.fetchone()[0]
        
        # Create a new table without object_type
        cursor.execute("""
            CREATE TABLE network_objects_new (
                network_object_id INTEGER PRIMARY KEY,
                name VARCHAR NOT NULL,
                object_type_id INTEGER NOT NULL,
                latitude FLOAT,
                longitude FLOAT,
                address VARCHAR,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME,
                FOREIGN KEY (object_type_id) REFERENCES object_types (object_type_id)
            )
        """)
        
        # Copy data from old table
        cursor.execute("""
            INSERT INTO network_objects_new 
            SELECT network_object_id, name, object_type_id, latitude, longitude, 
                   address, description, created_at, updated_at
            FROM network_objects
        """)
        
        # Drop old table
        cursor.execute("DROP TABLE network_objects")
        
        # Rename new table
        cursor.execute("ALTER TABLE network_objects_new RENAME TO network_objects")
        
        conn.commit()
        print("✅ Migration successful - object_type_id added and object_type removed")
    else:
        print("✓ Column object_type_id already exists")
    
    conn.close()
    
except sqlite3.Error as e:
    print(f"❌ Database error: {e}")
    exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
