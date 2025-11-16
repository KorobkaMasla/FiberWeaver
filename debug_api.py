import requests
import json

response = requests.get("http://localhost:8000/api/network-objects/")
if response.status_code == 200:
    objects = response.json()
    print(f"Total objects: {len(objects)}")
    if len(objects) > 0:
        print("\nFirst object structure:")
        print(json.dumps(objects[0], indent=2, ensure_ascii=False))
else:
    print(f"Error: {response.status_code}")
