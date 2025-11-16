from pydantic import BaseModel
from typing import Optional


class ObjectTypeBase(BaseModel):
    name: str
    display_name: str
    emoji: Optional[str] = None
    description: Optional[str] = None


class ObjectTypeCreate(ObjectTypeBase):
    pass


class ObjectType(ObjectTypeBase):
    object_type_id: int

    class Config:
        from_attributes = True
