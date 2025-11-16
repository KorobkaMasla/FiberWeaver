from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..database.database import Base


class Connection(Base):
    __tablename__ = "connections"

    connection_id = Column(Integer, primary_key=True, index=True)
    from_object_id = Column(Integer, ForeignKey("network_objects.network_object_id"), nullable=False)
    to_object_id = Column(Integer, ForeignKey("network_objects.network_object_id"), nullable=False)
    cable_id = Column(Integer, ForeignKey("cables.cable_id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, nullable=True)

