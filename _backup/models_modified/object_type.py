from sqlalchemy import Column, Integer, String, Text
from ..database.database import Base


class ObjectType(Base):
    __tablename__ = "object_types"

    object_type_id = Column(Integer, primary_key=True, index=True)
    object_name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
