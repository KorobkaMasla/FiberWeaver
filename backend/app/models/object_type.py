from sqlalchemy import Column, Integer, String, Text
from ..database.database import Base


class ObjectType(Base):
    __tablename__ = "object_types"

    object_type_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    emoji = Column(String, nullable=True)
    description = Column(Text, nullable=True)
