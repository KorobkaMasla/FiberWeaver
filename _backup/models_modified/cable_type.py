from sqlalchemy import Column, Integer, String, Text
from ..database.database import Base


class CableType(Base):
    __tablename__ = "cable_types"

    cable_type_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    fiber_count = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, nullable=False)  # HEX color
