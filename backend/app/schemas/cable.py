from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime


class CableCreate(BaseModel):
    name: str
    cable_type: Optional[str] = "optical"  
    cable_type_id: Optional[int] = None  
    fiber_count: Optional[int] = None
    from_object_id: int
    to_object_id: int
    distance_km: Optional[float] = None
    description: Optional[str] = None


class CableResponse(BaseModel):
    id: int = Field(validation_alias='cable_id')
    name: str
    cable_type_id: int
    cable_type_name: Optional[str] = None  
    cable_type_color: Optional[str] = None  
    fiber_count: Optional[int] = None
    from_object_id: int
    to_object_id: int
    distance_km: Optional[float] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True

