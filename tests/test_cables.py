#!/usr/bin/env python3
"""
Test script to create sample network objects and cables for visualization
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

# Семплевые сетевые объекты
objects = [
    {
        "name": "Central Hub",
        "object_type": "node",
        "latitude": 55.7558,
        "longitude": 37.6173,
    },
    {
        "name": "Mufta Station 1",
        "object_type": "mufa",
        "latitude": 55.7580,
        "longitude": 37.6200,
    },
    {
        "name": "Cabinet A",
        "object_type": "cabinet",
        "latitude": 55.7540,
        "longitude": 37.6150,
    },
    {
        "name": "Splitter Unit",
        "object_type": "splitter",
        "latitude": 55.7520,
        "longitude": 37.6100,
    },
    {
        "name": "Subscriber Building",
        "object_type": "subscriber",
        "latitude": 55.7500,
        "longitude": 37.6250,
    },
]

# Семплевые кабели, соединяющие объекты
cables = [
    {
        "name": "Main Line A",
        "cable_type": "optical",
        "from_object_id": 1,
        "to_object_id": 2,
        "fiber_count": 48,
        "distance_km": 0.5,
    },
    {
        "name": "Branch B",
        "cable_type": "optical",
        "from_object_id": 2,
        "to_object_id": 3,
        "fiber_count": 12,
        "distance_km": 0.3,
    },
    {
        "name": "Copper Line",
        "cable_type": "copper",
        "from_object_id": 3,
        "to_object_id": 4,
        "distance_km": 0.2,
    },
    {
        "name": "Final Drop",
        "cable_type": "optical",
        "from_object_id": 4,
        "to_object_id": 5,
        "fiber_count": 1,
        "distance_km": 0.1,
    },
]

def main():
    print("🌐 Creating test network objects and cables...\n")
    
    # Создание объектов
    print("📍 Creating network objects...")
    object_ids = {}
    for obj in objects:
        try:
            response = requests.post(f"{BASE_URL}/network-objects/", json=obj)
            if response.status_code == 200:
                created_obj = response.json()
                object_ids[obj["name"]] = created_obj["id"]
                print(f"  ✓ Created: {obj['name']} (ID: {created_obj['id']})")
            else:
                print(f"  ✗ Failed to create {obj['name']}: {response.text}")
        except Exception as e:
            print(f"  ✗ Error creating {obj['name']}: {e}")
    
    print()
    
    # Создание кабелей
    print("🔗 Creating cables...")
    for cable in cables:
        try:
            response = requests.post(f"{BASE_URL}/cables/", json=cable)
            if response.status_code == 200:
                created_cable = response.json()
                print(f"  ✓ Created: {cable['name']} ({cable['cable_type']})")
            else:
                print(f"  ✗ Failed to create {cable['name']}: {response.text}")
        except Exception as e:
            print(f"  ✗ Error creating {cable['name']}: {e}")
    
    print("\n✅ Done! Refresh the browser to see the cables on the map.")

if __name__ == "__main__":
    main()
