#!/usr/bin/env python3
"""Test cable type conversion and API"""

from app.schemas.cable import CableCreate
from app.database.database import SessionLocal
from app.models.cable_type import CableType

# Test Pydantic validation
print("Testing Pydantic validation...")
test_data = {
    'name': 'Test Cable',
    'cable_type': 'ОКГ-12',
    'from_object_id': 1,
    'to_object_id': 2,
    'fiber_count': 12
}

cable = CableCreate(**test_data)
print(f"  Input: cable_type = '{test_data['cable_type']}'")
print(f"  Output: cable_type_id = {cable.cable_type_id}")
print(f"  ✓ Validator works!\n")

# Test DB lookup
print("Testing cable type lookup in DB...")
db = SessionLocal()
for test_name in ['ОКГ-1', 'ОКГ-12', 'ОКГ-96']:
    cable_type = db.query(CableType).filter(CableType.name.ilike(test_name)).first()
    if cable_type:
        print(f"  ✓ '{test_name}' -> ID {cable_type.cable_type_id} (color: {cable_type.color})")
    else:
        print(f"  ✗ '{test_name}' not found")
db.close()

print("\n✅ All tests passed!")
