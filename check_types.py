import sqlite3

conn = sqlite3.connect('test.db')
cursor = conn.cursor()

print("Object types in database:")
cursor.execute("SELECT * FROM object_types")
for row in cursor.fetchall():
    print(row)

print("\n\nNetwork objects with their types:")
cursor.execute("""
    SELECT no.network_object_id, no.name, no.object_type_id, ot.name, ot.display_name 
    FROM network_objects no 
    LEFT JOIN object_types ot ON no.object_type_id = ot.object_type_id
""")
for row in cursor.fetchall():
    print(row)

conn.close()
