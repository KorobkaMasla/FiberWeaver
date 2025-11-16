from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..models.cable import Cable
from ..models.user import User
from ..schemas.cable import CableCreate, CableResponse
from ..core.dependencies import get_current_user

router = APIRouter(prefix="/api/cables", tags=["cables"])


@router.get("/", response_model=list[CableResponse])
def list_cables_public(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Public endpoint - no authentication required (for development/testing)"""
    return db.query(Cable).offset(skip).limit(limit).all()


@router.post("/", response_model=CableResponse)
def create_cable(
    cable: CableCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if cable already exists
    existing = db.query(Cable).filter(
        Cable.name == cable.name,
        Cable.from_object_id == cable.from_object_id,
        Cable.to_object_id == cable.to_object_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Cable with this name already exists between these objects")
    
    db_cable = Cable(**cable.model_dump())
    db.add(db_cable)
    db.commit()
    db_cable.refresh()
    return db_cable


@router.get("/{cable_id}", response_model=CableResponse)
def get_cable(
    cable_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cable = db.query(Cable).filter(Cable.cable_id == cable_id).first()
    if not cable:
        raise HTTPException(status_code=404, detail="Cable not found")
    return cable


@router.put("/{cable_id}", response_model=CableResponse)
def update_cable(
    cable_id: int, 
    cable_update: CableCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cable = db.query(Cable).filter(Cable.cable_id == cable_id).first()
    if not cable:
        raise HTTPException(status_code=404, detail="Cable not found")
    
    for key, value in cable_update.model_dump().items():
        setattr(cable, key, value)
    
    db.commit()
    db.refresh(cable)
    return cable


@router.delete("/{cable_id}")
def delete_cable(
    cable_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cable = db.query(Cable).filter(Cable.cable_id == cable_id).first()
    if not cable:
        raise HTTPException(status_code=404, detail="Cable not found")
    
    db.delete(cable)
    db.commit()
    return {"message": "Cable deleted successfully"}

