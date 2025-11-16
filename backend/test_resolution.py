#!/usr/bin/env python3
"""Test cable routes with cable type resolution"""

from app.database.database import SessionLocal
from app.routes.cables import _resolve_cable_type_id

db = SessionLocal()

print("Testing cable type resolution...")
test_cases = [
    ('ОКГ-1', None),
    ('ОКГ-12', None),
    ('ОКГ-96', None),
    (None, 5),
    ('invalid_name', None),
]

for cable_type, cable_type_id in test_cases:
    result = _resolve_cable_type_id(cable_type, cable_type_id, db)
    print(f"  cable_type='{cable_type}', cable_type_id={cable_type_id} -> ID {result}")

db.close()
print("\n✅ Resolution tests complete!")
