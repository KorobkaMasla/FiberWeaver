from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional
from datetime import datetime


class NetworkObjectCreate(BaseModel):
    name: str
    object_type_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    address: Optional[str] = None


class NetworkObjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True, populate_by_name=True)
    
    network_object_id: Optional[int] = None
    id: Optional[int] = None  # Alias for network_object_id for frontend compatibility
    name: str
    object_type_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @model_validator(mode='before')
    @classmethod
    def convert_network_object_id(cls, values):
        # Map 'id' to 'network_object_id' and vice versa
        if isinstance(values, dict):
            if 'id' not in values and 'network_object_id' in values:
                values['id'] = values['network_object_id']
            elif 'id' in values and 'network_object_id' not in values:
                values['network_object_id'] = values['id']
        return values
        """Convert network_object_id field to id"""
        # Обработка случая словаря
        if isinstance(values, dict):
            if 'network_object_id' in values:
                values['id'] = values.pop('network_object_id')
        # Обработка случая объекта (модель SQLAlchemy)
        else:
            if hasattr(values, 'network_object_id') and not hasattr(values, 'id'):
                # Конвертация объекта в словарь для обработки
                values_dict = {}
                for key in ['network_object_id', 'name', 'object_type', 'latitude', 'longitude', 
                            'description', 'created_at', 'updated_at']:
                    if hasattr(values, key):
                        val = getattr(values, key)
                        if key == 'network_object_id':
                            values_dict['id'] = val
                        else:
                            values_dict[key] = val
                return values_dict
        return values
    def __init__(self, **data):
        # Конвертация network_object_id в id при инициализации
        if 'network_object_id' in data and 'id' not in data:
            data['id'] = data.pop('network_object_id')
        super().__init__(**data)

