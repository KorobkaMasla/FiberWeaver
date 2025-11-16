from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional
from datetime import datetime


class CableCreate(BaseModel):
    name: str
    cable_type_id: int
    fiber_count: Optional[int] = None
    from_object_id: int
    to_object_id: int
    distance_km: Optional[float] = None
    description: Optional[str] = None


class CableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True, populate_by_name=True)
    
    cable_id: Optional[int] = None
    id: Optional[int] = None  # Alias for cable_id for frontend compatibility
    name: str
    cable_type_id: int
    fiber_count: Optional[int] = None
    from_object_id: int
    to_object_id: int
    distance_km: Optional[float] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @model_validator(mode='before')
    @classmethod
    def convert_cable_id(cls, values):
        # Map 'id' to 'cable_id' and vice versa
        if isinstance(values, dict):
            if 'id' not in values and 'cable_id' in values:
                values['id'] = values['cable_id']
            elif 'id' in values and 'cable_id' not in values:
                values['cable_id'] = values['id']
        return values
        """Convert cable_id field to id"""
        # Обработка случая словаря
        if isinstance(values, dict):
            if 'cable_id' in values:
                values['id'] = values.pop('cable_id')
        # Обработка случая объекта (модель SQLAlchemy)
        else:
            if hasattr(values, 'cable_id') and not hasattr(values, 'id'):
                # Конвертация объекта в словарь для обработки
                values_dict = {}
                for key in ['cable_id', 'name', 'cable_type', 'fiber_count', 'from_object_id', 
                            'to_object_id', 'distance_km', 'description', 'created_at', 'updated_at']:
                    if hasattr(values, key):
                        val = getattr(values, key)
                        if key == 'cable_id':
                            values_dict['id'] = val
                        else:
                            values_dict[key] = val
                return values_dict
        return values

