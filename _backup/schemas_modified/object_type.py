from pydantic import BaseModel
from typing import Optional


class ObjectTypeBase(BaseModel):
    object_name: str
    description: Optional[str] = None


class ObjectTypeCreate(ObjectTypeBase):
    pass


class ObjectType(ObjectTypeBase):
    object_type_id: int

    class Config:
        from_attributes = True
