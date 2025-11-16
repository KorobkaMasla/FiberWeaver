from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..models.cable_type import CableType as CableTypeModel
from ..models.object_type import ObjectType as ObjectTypeModel
from ..schemas.cable_type import CableType as CableTypeSchema, CableTypeCreate
from ..schemas.object_type import ObjectType as ObjectTypeSchema, ObjectTypeCreate

router = APIRouter(prefix="/api/reference", tags=["reference"])



@router.get("/cable-types", response_model=list[CableTypeSchema])
def get_cable_types(db: Session = Depends(get_db)):
    """Get all cable types"""
    return db.query(CableTypeModel).all()


@router.get("/cable-types/{cable_type_id}", response_model=CableTypeSchema)
def get_cable_type(cable_type_id: int, db: Session = Depends(get_db)):
    """Get cable type by ID"""
    return db.query(CableTypeModel).filter(CableTypeModel.cable_type_id == cable_type_id).first()


@router.post("/cable-types", response_model=CableTypeSchema)
def create_cable_type(cable_type: CableTypeCreate, db: Session = Depends(get_db)):
    """Create new cable type"""
    db_cable_type = CableTypeModel(**cable_type.model_dump())
    db.add(db_cable_type)
    db.commit()
    db.refresh(db_cable_type)
    return db_cable_type



@router.get("/object-types", response_model=list[ObjectTypeSchema])
def get_object_types(db: Session = Depends(get_db)):
    """Get all object types"""
    return db.query(ObjectTypeModel).all()


@router.get("/object-types/{object_type_id}", response_model=ObjectTypeSchema)
def get_object_type(object_type_id: int, db: Session = Depends(get_db)):
    """Get object type by ID"""
    return db.query(ObjectTypeModel).filter(ObjectTypeModel.object_type_id == object_type_id).first()


@router.post("/object-types", response_model=ObjectTypeSchema)
def create_object_type(object_type: ObjectTypeCreate, db: Session = Depends(get_db)):
    """Create new object type"""
    db_object_type = ObjectTypeModel(**object_type.model_dump())
    db.add(db_object_type)
    db.commit()
    db.refresh(db_object_type)
    return db_object_type
