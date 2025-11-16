from pydantic import BaseModel, ConfigDict, model_validator, Field
from typing import Optional
from datetime import datetime


class FiberSpliceCreate(BaseModel):
    cable_id: int
    fiber_number: int
    splice_to_fiber: int
    splice_to_cable_id: Optional[int] = None


class FiberSpliceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
    
    id: Optional[int] = None
    cable_id: int
    fiber_number: int
    splice_to_fiber: int
    splice_to_cable_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    
    @model_validator(mode='before')
    @classmethod
    def convert_fiber_splices_id(cls, values):
        """Convert fiber_splices_id field to id"""
        # Обработка случая словаря
        if isinstance(values, dict):
            if 'fiber_splices_id' in values:
                values['id'] = values.pop('fiber_splices_id')
        # Обработка случая объекта (модель SQLAlchemy)
        else:
            if hasattr(values, 'fiber_splices_id') and not hasattr(values, 'id'):
                # Конвертация объекта в словарь для обработки
                values_dict = {}
                for key in ['fiber_splices_id', 'cable_id', 'fiber_number', 'splice_to_fiber', 
                            'splice_to_cable_id', 'created_at', 'updated_at', 'notes']:
                    if hasattr(values, key):
                        val = getattr(values, key)
                        if key == 'fiber_splices_id':
                            values_dict['id'] = val
                        else:
                            values_dict[key] = val
                return values_dict
        return values

