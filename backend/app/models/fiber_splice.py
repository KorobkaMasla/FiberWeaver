from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..database.database import Base


class FiberSplice(Base):
    __tablename__ = "fiber_splices"

    fiber_splices_id = Column(Integer, primary_key=True, index=True)
    cable_id = Column(Integer, ForeignKey("cables.cable_id"), nullable=False)
    fiber_number = Column(Integer, nullable=False)
    splice_to_fiber = Column(Integer, nullable=False)
    splice_to_cable_id = Column(Integer, ForeignKey("cables.cable_id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, nullable=True)

