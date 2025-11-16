from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RegionBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    display_name: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    nominatim_id: Optional[int] = None
    description: Optional[str] = None


class RegionCreate(RegionBase):
    pass


class RegionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_name: Optional[str] = None


class RegionResponse(RegionBase):
    region_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class RegionWithObjects(RegionResponse):
    network_objects: List[dict] = []
    cables: List[dict] = []

    class Config:
        from_attributes = True
