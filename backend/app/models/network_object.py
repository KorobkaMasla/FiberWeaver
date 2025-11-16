from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.database import Base


class NetworkObject(Base):
    __tablename__ = "network_objects"

    network_object_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    object_type_id = Column(Integer, ForeignKey("object_types.object_type_id"), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String, index=True, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, nullable=True)

    # Связь с типом объекта
    object_type_obj = relationship("ObjectType", backref="network_objects")

