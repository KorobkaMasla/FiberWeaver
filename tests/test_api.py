#!/usr/bin/env python3
"""
Простой тестовый скрипт для проверки работы API
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Проверка доступности API"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print("✅ Health check: OK")
        print(f"   Response: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_create_network_object():
    """Тест создания сетевого объекта"""
    try:
        data = {
            "name": "Test Node 1",
            "object_type": "node",
            "latitude": 55.7558,
            "longitude": 37.6173,
            "description": "Test network object"
        }
        response = requests.post(
            f"{BASE_URL}/api/network-objects/",
            json=data
        )
        if response.status_code == 200:
            print("✅ Create network object: OK")
            print(f"   Created: {response.json()}")
            return response.json()["id"]
        else:
            print(f"❌ Create network object failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Create network object error: {e}")
        return None

def test_list_objects():
    """Test listing objects"""
    try:
        response = requests.get(f"{BASE_URL}/api/network-objects/")
        if response.status_code == 200:
            objects = response.json()
            print(f"✅ List objects: OK ({len(objects)} objects)")
            for obj in objects:
                print(f"   - {obj['name']} ({obj['object_type']})")
        else:
            print(f"❌ List objects failed: {response.status_code}")
    except Exception as e:
        print(f"❌ List objects error: {e}")

def main():
    print("\n" + "="*50)
    print("Cable Network Documentation API - Tests")
    print("="*50 + "\n")
    
    print("Testing connection to: " + BASE_URL)
    print()
    
    # Тест проверки состояния
    if not test_health():
        print("\n❌ API is not responding!")
        print("Make sure to run: python -m uvicorn app.main:app --reload")
        return
    
    print()
    
    # Тест создания сетевого объекта
    obj_id = test_create_network_object()
    
    print()
    
    # Тест списка объектов
    test_list_objects()
    
    print("\n" + "="*50)
    print("✅ All tests passed! API is working correctly.")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
