import sqlite3

conn = sqlite3.connect('backend/test.db')
cursor = conn.cursor()

print("Object types in database:")
cursor.execute("SELECT * FROM object_types")
for row in cursor.fetchall():
    print(f"  ID {row[0]}: {row[1]} ({row[2]}) {row[3]}")

print("\n\nNetwork objects with their types:")
cursor.execute("""
    SELECT no.network_object_id, no.name, no.object_type_id 
    FROM network_objects no 
    LIMIT 5
""")
for row in cursor.fetchall():
    print(f"  Object ID {row[0]}: name='{row[1]}', object_type_id={row[2]}")

print("\n\nJoin test:")
cursor.execute("""
    SELECT no.network_object_id, no.name, ot.name as type_name, ot.display_name, ot.emoji
    FROM network_objects no 
    LEFT JOIN object_types ot ON no.object_type_id = ot.object_type_id
    LIMIT 5
""")
for row in cursor.fetchall():
    print(f"  Object: {row[1]}, Type: {row[2]}, Display: {row[3]}, Emoji: {row[4]}")

conn.close()
