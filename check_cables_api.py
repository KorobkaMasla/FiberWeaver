import requests
import json

response = requests.get("http://localhost:8000/api/cables/")
if response.status_code == 200:
    cables = response.json()
    print(f"Total cables: {len(cables)}")
    if cables:
        print("\nFirst cable:")
        print(json.dumps(cables[0], indent=2, ensure_ascii=False))
else:
    print(f"Error: {response.status_code}")
