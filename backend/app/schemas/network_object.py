from pydantic import BaseModel, constr, Field
from typing import Optional
from datetime import datetime


class NetworkObjectCreate(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    object_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    description: Optional[str] = None


class NetworkObjectResponse(BaseModel):
    # Map SQLAlchemy attribute network_object_id -> id for frontend
    id: int = Field(validation_alias='network_object_id')
    name: str
    object_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

