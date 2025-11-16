"""
Backend utility functions for validation, formatting, and common operations
"""

from typing import Dict, List, Any, Optional, Tuple
from geopy.distance import geodesic
import json


class ValidationError(Exception):
    """Кастомное исключение для ошибок валидации"""
    pass


def validate_name(name: str, max_length: int = 255) -> bool:
    """Проверка имени объекта/кабеля"""
    if not name or not isinstance(name, str):
        return False
    if len(name) < 1 or len(name) > max_length:
        return False
    return True


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """Проверка широты и долготы"""
    try:
        lat = float(latitude)
        lon = float(longitude)
        return -90 <= lat <= 90 and -180 <= lon <= 180
    except (TypeError, ValueError):
        return False


def validate_fiber_count(count: int) -> bool:
    """Проверка количества волокон"""
    try:
        num = int(count)
        return 1 <= num <= 1000
    except (TypeError, ValueError):
        return False


def validate_distance(distance: float) -> bool:
    """Проверка длины кабеля"""
    if distance is None:
        return True  # Опциональное поле
    try:
        dist = float(distance)
        return dist >= 0
    except (TypeError, ValueError):
        return False


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Вычисление расстояния между двумя координатами с использованием geopy"""
    try:
        coord1 = (lat1, lon1)
        coord2 = (lat2, lon2)
        return geodesic(coord1, coord2).kilometers
    except Exception as e:
        print(f"Error calculating distance: {e}")
        return 0.0


def format_distance(distance: float) -> str:
    """Форматирование расстояния для отображения"""
    if distance is None or distance == 0:
        return "—"
    if distance < 1:
        return f"{int(distance * 1000)} м"
    return f"{distance:.2f} км"


def format_coordinates(latitude: float, longitude: float) -> str:
    """Форматирование координат для отображения"""
    lat_str = f"{abs(latitude):.6f}° {'N' if latitude >= 0 else 'S'}"
    lon_str = f"{abs(longitude):.6f}° {'E' if longitude >= 0 else 'W'}"
    return f"{lat_str}, {lon_str}"


def serialize_object_to_dict(obj) -> Dict[str, Any]:
    """Преобразование объекта SQLAlchemy в словарь"""
    if obj is None:
        return None
    
    result = {}
    for column in obj.__table__.columns:
        value = getattr(obj, column.name)
        
        # Обработка datetime
        if hasattr(value, 'isoformat'):
            result[column.name] = value.isoformat()
        else:
            result[column.name] = value
    
    return result


def validate_geojson_feature(feature: Dict[str, Any]) -> bool:
    """Проверка структуры GeoJSON feature"""
    if not isinstance(feature, dict):
        return False
    
    required_keys = {'type', 'geometry', 'properties'}
    if not required_keys.issubset(feature.keys()):
        return False
    
    if feature['type'] != 'Feature':
        return False
    
    geometry = feature.get('geometry', {})
    if not isinstance(geometry, dict) or 'type' not in geometry:
        return False
    
    return True


def validate_geojson_collection(data: Dict[str, Any]) -> bool:
    """Проверка структуры GeoJSON FeatureCollection"""
    if not isinstance(data, dict):
        return False
    
    if data.get('type') != 'FeatureCollection':
        return False
    
    features = data.get('features', [])
    if not isinstance(features, list):
        return False
    
    return all(validate_geojson_feature(f) for f in features)


def truncate_string(text: str, max_length: int) -> str:
    """Обрезать строку до максимальной длины с добавлением многоточия"""
    if not text or len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def camel_to_snake(name: str) -> str:
    """Преобразование camelCase в snake_case"""
    result = []
    for i, char in enumerate(name):
        if char.isupper() and i > 0:
            result.append('_')
            result.append(char.lower())
        else:
            result.append(char)
    return ''.join(result)


def snake_to_camel(name: str) -> str:
    """Преобразование snake_case в camelCase"""
    components = name.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def safe_json_dumps(obj, **kwargs) -> str:
    """Безопасное преобразование объекта в JSON строку"""
    try:
        return json.dumps(obj, default=str, **kwargs)
    except Exception as e:
        print(f"Error serializing to JSON: {e}")
        return "{}"


def safe_json_loads(data: str) -> Optional[Dict]:
    """Безопасный разбор JSON строки"""
    try:
        return json.loads(data)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        return None


def merge_dicts(*dicts) -> Dict:
    """Объединение нескольких словарей"""
    result = {}
    for d in dicts:
        if isinstance(d, dict):
            result.update(d)
    return result


def filter_dict(data: Dict, keys: List[str]) -> Dict:
    """Фильтрация словаря для включения только указанных ключей"""
    return {k: v for k, v in data.items() if k in keys}


def paginate(items: List, skip: int = 0, limit: int = 100) -> List:
    """Пагинация списка элементов"""
    return items[skip : skip + limit]


def chunk_list(lst: List, chunk_size: int) -> List[List]:
    """Разделение списка на чанки"""
    return [lst[i : i + chunk_size] for i in range(0, len(lst), chunk_size)]
