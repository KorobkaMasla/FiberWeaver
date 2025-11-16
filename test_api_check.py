import requests
import json

# Get network objects
response = requests.get("http://localhost:8000/api/network-objects/")
if response.status_code == 200:
    objects = response.json()
    print("Network Objects from API:")
    for obj in objects[:2]:  # Show first 2
        print(json.dumps(obj, indent=2, ensure_ascii=False))
else:
    print(f"Error: {response.status_code}")
    print(response.text)
