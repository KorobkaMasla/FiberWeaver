from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database.database import Base


class NetworkObject(Base):
    __tablename__ = "network_objects"

    network_object_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    object_type_id = Column(Integer, ForeignKey("object_types.object_type_id"), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    address = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # Relationship
    object_type = relationship("ObjectType")

