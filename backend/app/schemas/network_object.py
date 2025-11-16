from pydantic import BaseModel, constr, Field, computed_field, field_serializer, model_validator
from typing import Optional
from datetime import datetime


class NetworkObjectCreate(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    object_type_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    description: Optional[str] = None


class NetworkObjectResponse(BaseModel):
    id: int = Field(validation_alias='network_object_id')
    name: str
    object_type_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    object_type_obj: Optional[object] = Field(default=None, exclude=True)
    
    object_type: str = 'unknown'
    display_name: Optional[str] = None

    @model_validator(mode='after')
    def populate_computed_fields(self):
        """Populate computed fields from object_type_obj relationship"""
        if self.object_type_obj:
            if hasattr(self.object_type_obj, 'name'):
                self.object_type = self.object_type_obj.name
            if hasattr(self.object_type_obj, 'display_name'):
                self.display_name = self.object_type_obj.display_name
        return self

    class Config:
        from_attributes = True

