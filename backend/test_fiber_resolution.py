"""Test cable type resolution with fiber_count"""

from app.database.database import SessionLocal
from app.routes.cables import _resolve_cable_type_id
from app.models.cable_type import CableType

db = SessionLocal()

print("Testing cable type resolution by fiber_count:")
test_cases = [
    (None, None, 1, "No type, no ID, 1 fiber"),
    (None, None, 12, "No type, no ID, 12 fibers"),
    (None, None, 96, "No type, no ID, 96 fibers"),
    (None, None, 77, "No type, no ID, 77 fibers (unknown) - should default"),
    ('ОКГ-12', None, None, "Type name only, no fibers"),
]

for cable_type, cable_type_id, fiber_count, desc in test_cases:
    result = _resolve_cable_type_id(cable_type, cable_type_id, fiber_count, db)
    cable_obj = db.query(CableType).filter(CableType.cable_type_id == result).first()
    name = cable_obj.name if cable_obj else "NOT FOUND"
    print(f"  {desc}")
    print(f"    → ID {result}: {name}\n")

db.close()
print("✅ Resolution tests complete!")
