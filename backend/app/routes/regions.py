from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime
from ..database.database import get_db
from ..models.region import Region
from ..models.network_object import NetworkObject
from ..models.cable import Cable
from ..schemas.region import RegionCreate, RegionResponse, RegionWithObjects, RegionUpdate

router = APIRouter(prefix="/api/regions", tags=["regions"])


@router.post("/", response_model=RegionResponse)
def create_region(region: RegionCreate, db: Session = Depends(get_db)):
    """Create a new region"""

    existing = db.query(Region).filter(Region.name == region.name).first()
    if existing:
        return existing  
    
    db_region = Region(**region.dict())
    db.add(db_region)
    try:
        db.commit()
        db.refresh(db_region)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Region with this name already exists")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating region: {str(e)}")
    return db_region


@router.get("/", response_model=List[RegionResponse])
def list_regions(db: Session = Depends(get_db)):
    """List all regions"""
    return db.query(Region).all()


@router.get("/{region_id}", response_model=RegionWithObjects)
def get_region(region_id: int, db: Session = Depends(get_db)):
    """Get region with all objects and cables"""
    from sqlalchemy import text
    
    region = db.query(Region).filter(Region.region_id == region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    
    
    region_objects_result = db.execute(text(
        f"SELECT no.* FROM network_objects no "
        f"INNER JOIN region_objects ro ON no.network_object_id = ro.network_object_id "
        f"WHERE ro.region_id = {region_id}"
    )).fetchall()
    
    network_objects = []
    for row in region_objects_result:
        obj_dict = dict(row._mapping) if hasattr(row, '_mapping') else row
        
        if 'network_object_id' in obj_dict:
            obj_dict['id'] = obj_dict['network_object_id']
        network_objects.append(obj_dict)
    
    
    region_cables_result = db.execute(text(
        f"SELECT c.* FROM cables c "
        f"INNER JOIN region_cables rc ON c.cable_id = rc.cable_id "
        f"WHERE rc.region_id = {region_id}"
    )).fetchall()
    
    cables = []
    for row in region_cables_result:
        cable_dict = dict(row._mapping) if hasattr(row, '_mapping') else row
        
        if 'cable_id' in cable_dict:
            cable_dict['id'] = cable_dict['cable_id']
        cables.append(cable_dict)
    
   
    response = {
        'region_id': region.region_id,
        'name': region.name,
        'latitude': region.latitude,
        'longitude': region.longitude,
        'display_name': region.display_name,
        'country': region.country,
        'state': region.state,
        'nominatim_id': region.nominatim_id,
        'description': region.description,
        'created_at': region.created_at,
        'updated_at': region.updated_at,
        'network_objects': network_objects,
        'cables': cables
    }
    
    return response


@router.put("/{region_id}", response_model=RegionResponse)
def update_region(region_id: int, region: RegionUpdate, db: Session = Depends(get_db)):
    """Update region info"""
    db_region = db.query(Region).filter(Region.region_id == region_id).first()
    if not db_region:
        raise HTTPException(status_code=404, detail="Region not found")
    
    for key, value in region.dict(exclude_unset=True).items():
        setattr(db_region, key, value)
    
    db.commit()
    db.refresh(db_region)
    return db_region


@router.delete("/{region_id}")
def delete_region(region_id: int, db: Session = Depends(get_db)):
    """Delete region"""
    db_region = db.query(Region).filter(Region.region_id == region_id).first()
    if not db_region:
        raise HTTPException(status_code=404, detail="Region not found")
    
    db.delete(db_region)
    db.commit()
    return {"message": "Region deleted"}


@router.post("/{region_id}/objects/{object_id}")
def add_object_to_region(region_id: int, object_id: int, db: Session = Depends(get_db)):
    """Add network object to region"""
    from sqlalchemy import text
    
    region = db.query(Region).filter(Region.region_id == region_id).first()
    obj = db.query(NetworkObject).filter(NetworkObject.network_object_id == object_id).first()
    
    if not region or not obj:
        raise HTTPException(status_code=404, detail="Region or object not found")
    
    try:
        db.execute(text(
            f"INSERT OR IGNORE INTO region_objects (region_id, network_object_id) "
            f"VALUES ({region_id}, {object_id})"
        ))
        region.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error adding object: {str(e)}")
    
    return {"message": "Object added to region"}


@router.delete("/{region_id}/objects/{object_id}")
def remove_object_from_region(region_id: int, object_id: int, db: Session = Depends(get_db)):
    """Remove network object from region"""
    from sqlalchemy import text
    
    region = db.query(Region).filter(Region.region_id == region_id).first()
    obj = db.query(NetworkObject).filter(NetworkObject.network_object_id == object_id).first()
    
    if not region or not obj:
        raise HTTPException(status_code=404, detail="Region or object not found")
    
    try:
        db.execute(text(
            f"DELETE FROM region_objects WHERE region_id = {region_id} AND network_object_id = {object_id}"
        ))
        region.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error removing object: {str(e)}")
    
    return {"message": "Object removed from region"}


@router.post("/{region_id}/cables/{cable_id}")
def add_cable_to_region(region_id: int, cable_id: int, db: Session = Depends(get_db)):
    """Add cable to region (only if both endpoints are in the region)"""
    from sqlalchemy import text
    
    region = db.query(Region).filter(Region.region_id == region_id).first()
    cable = db.query(Cable).filter(Cable.cable_id == cable_id).first()
    
    if not region or not cable:
        raise HTTPException(status_code=404, detail="Region or cable not found")
        
    obj_count = db.execute(text(
        f"SELECT COUNT(*) FROM region_objects WHERE region_id = {region_id} "
        f"AND network_object_id IN ({cable.from_object_id}, {cable.to_object_id})"
    )).scalar()
    
    if obj_count != 2:
        raise HTTPException(
            status_code=400,
            detail="Cable endpoints must both be in the region"
        )
    
    try:
        db.execute(text(
            f"INSERT OR IGNORE INTO region_cables (region_id, cable_id) "
            f"VALUES ({region_id}, {cable_id})"
        ))
        region.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error adding cable: {str(e)}")
    
    return {"message": "Cable added to region"}


@router.delete("/{region_id}/cables/{cable_id}")
def remove_cable_from_region(region_id: int, cable_id: int, db: Session = Depends(get_db)):
    """Remove cable from region"""
    from sqlalchemy import text
    
    region = db.query(Region).filter(Region.region_id == region_id).first()
    cable = db.query(Cable).filter(Cable.cable_id == cable_id).first()
    
    if not region or not cable:
        raise HTTPException(status_code=404, detail="Region or cable not found")
    
    try:
        db.execute(text(
            f"DELETE FROM region_cables WHERE region_id = {region_id} AND cable_id = {cable_id}"
        ))
        region.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error removing cable: {str(e)}")
    
    return {"message": "Cable removed from region"}


@router.get("/{region_id}/objects", response_model=List[dict])
def get_region_objects(region_id: int, db: Session = Depends(get_db)):
    """Get all objects in a region"""
    region = db.query(Region).filter(Region.region_id == region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    
    return [
        {
            "network_object_id": obj.network_object_id,
            "name": obj.name,
            "object_type": obj.object_type,
            "latitude": obj.latitude,
            "longitude": obj.longitude,
            "address": obj.address,
        }
        for obj in region.network_objects
    ]


@router.get("/{region_id}/cables", response_model=List[dict])
def get_region_cables(region_id: int, db: Session = Depends(get_db)):
    """Get all cables in a region"""
    region = db.query(Region).filter(Region.region_id == region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    
    return [
        {
            "cable_id": cable.cable_id,
            "name": cable.name,
            "from_object_id": cable.from_object_id,
            "to_object_id": cable.to_object_id,
        }
        for cable in region.cables
    ]
