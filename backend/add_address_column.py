#!/usr/bin/env python
"""Add address column to existing network_objects table"""

import sqlite3
import sys
from pathlib import Path

def add_address_column():
    """Add address column to network_objects table if it doesn't exist"""
    db_path = Path(__file__).parent / "test.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        print("Please ensure the database has been initialized first.")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(network_objects)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'address' in columns:
            print("✓ Address column already exists in network_objects table")
            conn.close()
            return True
        
        # Add address column
        print("Adding address column to network_objects table...")
        cursor.execute("ALTER TABLE network_objects ADD COLUMN address TEXT")
        
        # Create index on address column for search optimization
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_network_objects_address 
            ON network_objects (address)
        """)
        
        conn.commit()
        print("✓ Address column added successfully!")
        print("✓ Index created for address column")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    success = add_address_column()
    sys.exit(0 if success else 1)
