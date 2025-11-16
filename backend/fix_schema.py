"""
Fix: Properly migrate from object_type to object_type_id
Removes old object_type column and makes object_type_id NOT NULL
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
    
    print("Step 1: Populate object_type_id from object_type names...")
    cursor.execute("""
        UPDATE network_objects
        SET object_type_id = (
            SELECT object_type_id FROM object_types 
            WHERE object_types.name = network_objects.object_type
            LIMIT 1
        )
        WHERE object_type_id IS NULL
    """)
    print(f"  Updated {cursor.rowcount} rows")
    
    cursor.execute("""
        UPDATE network_objects
        SET object_type_id = 1
        WHERE object_type_id IS NULL
    """)
    print(f"  Set {cursor.rowcount} remaining rows to default type (ID 1)")
    
    print("\nStep 2: Recreating table without object_type column...")
    
    cursor.execute("""
        CREATE TABLE network_objects_new (
            network_object_id INTEGER PRIMARY KEY,
            name VARCHAR NOT NULL,
            object_type_id INTEGER NOT NULL,
            latitude FLOAT,
            longitude FLOAT,
            address TEXT,
            description TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            FOREIGN KEY (object_type_id) REFERENCES object_types (object_type_id)
        )
    """)
    
    cursor.execute("""
        INSERT INTO network_objects_new 
        SELECT network_object_id, name, object_type_id, latitude, longitude, 
               address, description, created_at, updated_at
        FROM network_objects
    """)
    print(f"  Copied {cursor.rowcount} rows to new table")
    
    cursor.execute("DROP TABLE network_objects")
    
    cursor.execute("ALTER TABLE network_objects_new RENAME TO network_objects")
    
    cursor.execute("""
        CREATE INDEX idx_network_objects_object_type_id 
        ON network_objects(object_type_id)
    """)
    
    conn.commit()
    print("✅ Schema migration successful!")
    
    print("\nVerifying new schema...")
    cursor.execute("PRAGMA table_info(network_objects)")
    for col in cursor.fetchall():
        print(f"  {col[1]}: {col[2]} (nullable: {col[3] == 0})")
    
    conn.close()
    
except sqlite3.Error as e:
    print(f"❌ Database error: {e}")
    if conn:
        conn.rollback()
    exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
