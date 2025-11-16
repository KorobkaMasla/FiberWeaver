import sqlite3

conn = sqlite3.connect('test.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Tables in DB:')
for table in tables:
    print(f'  - {table[0]}')

cursor.execute("SELECT COUNT(*) FROM network_objects")
obj_count = cursor.fetchone()[0]
print(f'\nNetwork objects count: {obj_count}')

cursor.execute("SELECT COUNT(*) FROM cables")
cable_count = cursor.fetchone()[0]
print(f'Cables count: {cable_count}')

cursor.execute("SELECT COUNT(*) FROM cable_types")
type_count = cursor.fetchone()[0]
print(f'Cable types count: {type_count}')

print('\nFirst 5 network objects:')
cursor.execute("SELECT id, name, object_type FROM network_objects LIMIT 5")
for row in cursor.fetchall():
    print(f'  - {row}')

print('\nCable types:')
cursor.execute("SELECT cable_type_id, name, fiber_count, color FROM cable_types")
for row in cursor.fetchall():
    print(f'  - ID={row[0]}, name={row[1]}, fiber_count={row[2]}, color={row[3]}')

conn.close()
