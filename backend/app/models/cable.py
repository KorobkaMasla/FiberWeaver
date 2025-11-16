from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.database import Base


class Cable(Base):
    __tablename__ = "cables"

    cable_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    cable_type_id = Column(Integer, ForeignKey("cable_types.cable_type_id"), nullable=False)
    fiber_count = Column(Integer, nullable=True)
    from_object_id = Column(Integer, ForeignKey("network_objects.network_object_id"), nullable=False)
    to_object_id = Column(Integer, ForeignKey("network_objects.network_object_id"), nullable=False)
    distance_km = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    cable_type = relationship("CableType", backref="cables")
    from_object = relationship("NetworkObject", foreign_keys=[from_object_id], backref="cables_from")
    to_object = relationship("NetworkObject", foreign_keys=[to_object_id], backref="cables_to")

