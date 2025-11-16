from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..models.network_object import NetworkObject
from ..models.cable import Cable
from ..models.fiber_splice import FiberSplice
import json
from datetime import datetime

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/full")
def export_full_schema(db: Session = Depends(get_db)):
    """Export complete network schema as JSON with all objects, cables, and splices"""
    
    objects = db.query(NetworkObject).all()
    cables = db.query(Cable).all()
    splices = db.query(FiberSplice).all()
    
    export_data = {
        "version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "objects": [
            {
                "id": obj.network_object_id,
                "name": obj.name,
                "object_type": obj.object_type,
                "latitude": obj.latitude,
                "longitude": obj.longitude,
                "created_at": obj.created_at.isoformat() if obj.created_at else None
            }
            for obj in objects
        ],
        "cables": [
            {
                "id": cable.cable_id,
                "name": cable.name,
                "cable_type": cable.cable_type,
                "fiber_count": cable.fiber_count,
                "from_object_id": cable.from_object_id,
                "to_object_id": cable.to_object_id,
                "distance_km": cable.distance_km,
                "description": cable.description,
                "created_at": cable.created_at.isoformat() if cable.created_at else None
            }
            for cable in cables
        ],
        "fiber_splices": [
            {
                "id": splice.fiber_splices_id,
                "cable_id": splice.cable_id,
                "fiber_number": splice.fiber_number,
                "splice_to_cable_id": splice.splice_to_cable_id,
                "splice_to_fiber": splice.splice_to_fiber,
                "created_at": splice.created_at.isoformat() if splice.created_at else None
            }
            for splice in splices
        ]
    }
    
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f'attachment; filename="network_schema_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json"'
        }
    )


@router.get("/geojson")
def export_geojson(db: Session = Depends(get_db)):
    """Export network objects as GeoJSON for mapping applications"""
    
    objects = db.query(NetworkObject).all()
    cables = db.query(Cable).all()
    
    features = []
    
    # Add objects as points
    for obj in objects:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [obj.longitude, obj.latitude]
            },
            "properties": {
                "id": obj.network_object_id,
                "name": obj.name,
                "type": obj.object_type,
                "feature_type": "network_object"
            }
        })
    
    # Add cables as line strings
    for cable in cables:
        from_obj = next((o for o in objects if o.network_object_id == cable.from_object_id), None)
        to_obj = next((o for o in objects if o.network_object_id == cable.to_object_id), None)
        
        if from_obj and to_obj:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [from_obj.longitude, from_obj.latitude],
                        [to_obj.longitude, to_obj.latitude]
                    ]
                },
                "properties": {
                    "id": cable.cable_id,
                    "name": cable.name,
                    "cable_type": cable.cable_type,
                    "fiber_count": cable.fiber_count,
                    "distance_km": cable.distance_km,
                    "feature_type": "cable"
                }
            })
    
    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "version": "1.0",
            "exported_at": datetime.utcnow().isoformat()
        }
    }
    
    return JSONResponse(
        content=geojson,
        headers={
            "Content-Disposition": f'attachment; filename="network_schema_{datetime.now().strftime("%Y%m%d_%H%M%S")}.geojson"'
        }
    )
