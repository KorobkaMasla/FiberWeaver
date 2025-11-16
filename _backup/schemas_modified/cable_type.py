from pydantic import BaseModel
from typing import Optional


class CableTypeBase(BaseModel):
    name: str
    fiber_count: int
    description: Optional[str] = None
    color: str


class CableTypeCreate(CableTypeBase):
    pass


class CableType(CableTypeBase):
    cable_type_id: int

    class Config:
        from_attributes = True
