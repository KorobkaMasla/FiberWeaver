from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Table, ForeignKey, event
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.database import Base


region_objects = Table(
    'region_objects',
    Base.metadata,
    Column('region_id', Integer, ForeignKey('regions.region_id'), primary_key=True),
    Column('network_object_id', Integer, ForeignKey('network_objects.network_object_id'), primary_key=True)
)

region_cables = Table(
    'region_cables',
    Base.metadata,
    Column('region_id', Integer, ForeignKey('regions.region_id'), primary_key=True),
    Column('cable_id', Integer, ForeignKey('cables.cable_id'), primary_key=True)
)


class Region(Base):
    __tablename__ = "regions"

    region_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, unique=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    display_name = Column(String, nullable=True)  
    country = Column(String, nullable=True)
    state = Column(String, nullable=True)
    nominatim_id = Column(Integer, nullable=True, unique=True)  
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    network_objects = relationship(
        "NetworkObject",
        secondary=region_objects,
        backref="regions",
        cascade="all, delete"
    )
    cables = relationship(
        "Cable",
        secondary=region_cables,
        backref="regions",
        cascade="all, delete"
    )


@event.listens_for(Region.network_objects, "append")
@event.listens_for(Region.network_objects, "remove")
@event.listens_for(Region.cables, "append")
@event.listens_for(Region.cables, "remove")
def receive_append(target, value, initiator):
    target.updated_at = func.now()
