import sqlite3
conn = sqlite3.connect('test.db')
cursor = conn.cursor()
print("network_objects columns:")
cursor.execute("PRAGMA table_info(network_objects)")
for col in cursor.fetchall():
    print(f"  {col[1]}: {col[2]} (nullable: {col[3] == 0})")
print("\nobject_types columns:")
cursor.execute("PRAGMA table_info(object_types)")
for col in cursor.fetchall():
    print(f"  {col[1]}: {col[2]}")
conn.close()
