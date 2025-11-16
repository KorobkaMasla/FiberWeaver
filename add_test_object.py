import requests
import json

# Create a test object
data = {
    "name": "Тестовый узел",
    "object_type_id": 1,  # node type
    "latitude": 55.7558,
    "longitude": 37.6173,
    "address": "Red Square, Moscow"
}

response = requests.post("http://localhost:8000/api/network-objects/", json=data)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

# Get all objects
response = requests.get("http://localhost:8000/api/network-objects/")
if response.status_code == 200:
    objects = response.json()
    print(f"\nAll objects ({len(objects)}):")
    for obj in objects:
        print(json.dumps(obj, indent=2, ensure_ascii=False))
