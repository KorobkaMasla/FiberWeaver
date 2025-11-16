from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from datetime import datetime
from ..database.database import get_db
from ..models.network_object import NetworkObject
from ..models.region import Region
from ..models.user import User
from ..schemas.network_object import NetworkObjectCreate, NetworkObjectResponse
from ..core.dependencies import get_current_user

router = APIRouter(prefix="/api/network-objects", tags=["network_objects"])


@router.get("/", response_model=list[NetworkObjectResponse])
def list_network_objects_public(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Public endpoint - no authentication required (for development/testing)"""
    return db.query(NetworkObject).options(selectinload(NetworkObject.object_type_obj)).offset(skip).limit(limit).all()


@router.post("/", response_model=NetworkObjectResponse)
def create_network_object(
    obj: NetworkObjectCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(NetworkObject).filter(
        NetworkObject.name == obj.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Object with this name already exists")
    
    db_obj = NetworkObject(**obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    
    if db_obj.address:
        try:            
            regions = db.query(Region).all()
            for region in regions:
                if region.name.lower() in db_obj.address.lower():
                    
                    from sqlalchemy import text
                    db.execute(text(
                        f"INSERT OR IGNORE INTO region_objects (region_id, network_object_id) "
                        f"VALUES ({region.region_id}, {db_obj.network_object_id})"
                    ))
                    region.updated_at = datetime.utcnow()
                    db.commit()
                    print(f"Added object {db_obj.network_object_id} to region {region.region_id}")
                    break
        except Exception as e:
            print(f"Error adding object to region: {e}")
            db.rollback()
            
       
    db_obj = db.query(NetworkObject).options(selectinload(NetworkObject.object_type_obj)).filter(
        NetworkObject.network_object_id == db_obj.network_object_id
    ).first()
    
    return db_obj


@router.get("/{object_id}", response_model=NetworkObjectResponse)
def get_network_object(
    object_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    obj = db.query(NetworkObject).options(selectinload(NetworkObject.object_type_obj)).filter(NetworkObject.network_object_id == object_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    return obj


@router.put("/{object_id}", response_model=NetworkObjectResponse)
def update_network_object(
    object_id: int, 
    obj_update: NetworkObjectCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    obj = db.query(NetworkObject).options(selectinload(NetworkObject.object_type_obj)).filter(NetworkObject.network_object_id == object_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    
    for key, value in obj_update.model_dump().items():
        setattr(obj, key, value)
    
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{object_id}")
def delete_network_object(
    object_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    obj = db.query(NetworkObject).options(selectinload(NetworkObject.object_type_obj)).filter(NetworkObject.network_object_id == object_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    
    db.delete(obj)
    db.commit()
    return {"message": "Object deleted successfully"}

