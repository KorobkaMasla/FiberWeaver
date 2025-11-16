from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ConnectionCreate(BaseModel):
    from_object_id: int
    to_object_id: int
    cable_id: Optional[int] = None


class ConnectionResponse(BaseModel):
    connection_id: int
    from_object_id: int
    to_object_id: int
    cable_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

