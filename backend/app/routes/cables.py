from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from ..database.database import get_db
from ..models.cable import Cable
from ..models.cable_type import CableType
from ..models.region import Region
from ..models.user import User
from ..schemas.cable import CableCreate, CableResponse
from ..core.dependencies import get_current_user

router = APIRouter(prefix="/api/cables", tags=["cables"])


def _resolve_cable_type_id(cable_type: Optional[str], cable_type_id: Optional[int], fiber_count: Optional[int], db: Session) -> int:
    """Resolve cable_type ID - can be by name, ID, or fiber_count"""
    print(f"[RESOLVER] cable_type={cable_type}, cable_type_id={cable_type_id}, fiber_count={fiber_count}")
    
    if cable_type_id:
        print(f"[RESOLVER] Using provided cable_type_id: {cable_type_id}")
        return cable_type_id
    
    if cable_type and cable_type.lower() == 'optical' and fiber_count:
        print(f"[RESOLVER] Searching for optical type with fiber_count={fiber_count}")
        type_obj = db.query(CableType).filter(
            CableType.fiber_count == fiber_count,
            CableType.name.like('ОКГ-%') 
        ).first()
        if type_obj:
            print(f"[RESOLVER] Found type: {type_obj.name} (ID={type_obj.cable_type_id})")
            return type_obj.cable_type_id
        else:
            print(f"[RESOLVER] No specific optical type found with fiber_count={fiber_count}, using generic 'Оптический'")
            type_obj = db.query(CableType).filter(CableType.name == "Оптический").first()
            if type_obj:
                return type_obj.cable_type_id
    
    if cable_type and cable_type.lower() == 'copper':
        print(f"[RESOLVER] Copper type selected, using 'Медный'")
        type_obj = db.query(CableType).filter(CableType.name == "Медный").first()
        if type_obj:
            print(f"[RESOLVER] Found type: {type_obj.name} (ID={type_obj.cable_type_id})")
            return type_obj.cable_type_id
    
    if cable_type:
        print(f"[RESOLVER] Searching for type by name: {cable_type}")
        type_obj = db.query(CableType).filter(
            CableType.name.ilike(cable_type)
        ).first()
        if type_obj:
            print(f"[RESOLVER] Found type: {type_obj.name} (ID={type_obj.cable_type_id})")
            return type_obj.cable_type_id
        else:
            print(f"[RESOLVER] No type found with name like: {cable_type}")
    
    print(f"[RESOLVER] Using fallback - generic 'Оптический' type")
    generic_type = db.query(CableType).filter(CableType.name == "Оптический").first()
    if generic_type:
        print(f"[RESOLVER] Fallback type ID: {generic_type.cable_type_id}")
        return generic_type.cable_type_id
    
    first_type = db.query(CableType).first()
    result_id = first_type.cable_type_id if first_type else 1
    print(f"[RESOLVER] Last resort type ID: {result_id}")
    return result_id


def _cable_to_response(cable: Cable) -> dict:
    """Convert Cable ORM to response dict with cable_type_name and cable_type_color"""
    cable_type_name = cable.cable_type.name if cable.cable_type else None
    cable_type_color = cable.cable_type.color if cable.cable_type else None
    return {
        'cable_id': cable.cable_id,
        'name': cable.name,
        'cable_type_id': cable.cable_type_id,
        'cable_type_name': cable_type_name,
        'cable_type_color': cable_type_color,
        'fiber_count': cable.fiber_count,
        'from_object_id': cable.from_object_id,
        'to_object_id': cable.to_object_id,
        'distance_km': cable.distance_km,
        'description': cable.description,
        'created_at': cable.created_at,
        'updated_at': cable.updated_at
    }


@router.get("/", response_model=list[CableResponse])
def list_cables_public(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Public endpoint - no authentication required (for development/testing)"""
    cables = db.query(Cable).offset(skip).limit(limit).all()
    return [_cable_to_response(cable) for cable in cables]


@router.post("/", response_model=CableResponse)
def create_cable(
    cable: CableCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print("=== CREATE CABLE START ===")
    print("Payload:", cable.model_dump())
    
    existing = db.query(Cable).filter(
        Cable.name == cable.name,
        Cable.from_object_id == cable.from_object_id,
        Cable.to_object_id == cable.to_object_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Cable with this name already exists between these objects")
    
    resolved_cable_type_id = _resolve_cable_type_id(cable.cable_type, cable.cable_type_id, cable.fiber_count, db)
    
    data = cable.model_dump(exclude={'cable_type'})  
    data['cable_type_id'] = resolved_cable_type_id
    db_cable = Cable(**data)
    db.add(db_cable)
    db.commit()
    db.refresh(db_cable)
    print("Created cable id=", db_cable.cable_id, "fiber_count=", db_cable.fiber_count)
    
    try:
        from_obj = db_cable.from_object
        to_obj = db_cable.to_object
        
        if from_obj and to_obj:
            from sqlalchemy import text
            all_regions = db.query(Region).all()
            for region in all_regions:
                obj_count = db.execute(text(
                    f"SELECT COUNT(*) FROM region_objects WHERE region_id = {region.region_id} "
                    f"AND network_object_id IN ({from_obj.network_object_id}, {to_obj.network_object_id})"
                )).scalar()
                
                if obj_count == 2: 
                    db.execute(text(
                        f"INSERT OR IGNORE INTO region_cables (region_id, cable_id) "
                        f"VALUES ({region.region_id}, {db_cable.cable_id})"
                    ))
                    region.updated_at = datetime.utcnow()
                    print(f"Added cable {db_cable.cable_id} to region {region.region_id}")
            
            db.commit()
    except Exception as e:
        print(f"Error adding cable to regions: {e}")
        db.rollback()      
    
    print("=== CREATE CABLE SUCCESS ===")
    return _cable_to_response(db_cable)


@router.get("/{cable_id}", response_model=CableResponse)
def get_cable(
    cable_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cable = db.query(Cable).filter(Cable.cable_id == cable_id).first()
    if not cable:
        raise HTTPException(status_code=404, detail="Cable not found")
    return _cable_to_response(cable)


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
    
    resolved_cable_type_id = _resolve_cable_type_id(cable_update.cable_type, cable_update.cable_type_id, cable_update.fiber_count, db)
    
    data = cable_update.model_dump(exclude={'cable_type'})  
    data['cable_type_id'] = resolved_cable_type_id
    
    for key, value in data.items():
        setattr(cable, key, value)
    
    cable.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cable)
    return _cable_to_response(cable)


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