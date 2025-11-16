from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..models.network_object import NetworkObject
from ..models.cable import Cable
from ..models.fiber_splice import FiberSplice
import json

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/schema")
async def import_schema(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import network schema from JSON file"""
    
    try:
        contents = await file.read()
        data = json.loads(contents)
        
        imported_counts = {
            "objects": 0,
            "cables": 0,
            "splices": 0
        }
        
        object_id_map = {}  # Отображение старых ID на новые ID
        
        # Импорт объектов
        if "objects" in data:
            for obj_data in data["objects"]:
                # Пропустить, если объект с таким именем уже существует
                existing = db.query(NetworkObject).filter(
                    NetworkObject.name == obj_data["name"]
                ).first()
                
                if not existing:
                    new_obj = NetworkObject(
                        name=obj_data["name"],
                        object_type=obj_data.get("object_type", "node"),
                        latitude=obj_data["latitude"],
                        longitude=obj_data["longitude"]
                    )
                    db.add(new_obj)
                    db.flush()
                    object_id_map[obj_data["id"]] = new_obj.network_object_id
                    imported_counts["objects"] += 1
                else:
                    # Отобразить существующий ID объекта
                    object_id_map[obj_data["id"]] = existing.network_object_id
        
        db.commit()
        
        # Импорт кабелей (после создания объектов)
        if "cables" in data:
            for cable_data in data["cables"]:
                # Отобразить старые ID на новые ID
                from_obj_id = object_id_map.get(cable_data["from_object_id"])
                to_obj_id = object_id_map.get(cable_data["to_object_id"])
                
                if from_obj_id and to_obj_id:
                    # Пропустить, если кабель с таким именем уже существует
                    existing = db.query(Cable).filter(
                        Cable.name == cable_data["name"]
                    ).first()
                    
                    if not existing:
                        new_cable = Cable(
                            name=cable_data["name"],
                            cable_type=cable_data.get("cable_type", "optical"),
                            fiber_count=cable_data.get("fiber_count", 1),
                            from_object_id=from_obj_id,
                            to_object_id=to_obj_id,
                            distance_km=cable_data.get("distance_km"),
                            description=cable_data.get("description")
                        )
                        db.add(new_cable)
                        db.flush()
                        imported_counts["cables"] += 1
        
        db.commit()
        
        cable_id_map = {}  # Отображение старых ID кабелей на новые ID
        
        # Построение отображения ID кабелей из созданных
        if "cables" in data:
            for cable_data in data["cables"]:
                from_obj_id = object_id_map.get(cable_data["from_object_id"])
                to_obj_id = object_id_map.get(cable_data["to_object_id"])
                
                if from_obj_id and to_obj_id:
                    # Find the cable (either existing or newly created)
                    cable = db.query(Cable).filter(
                        Cable.name == cable_data["name"],
                        Cable.from_object_id == from_obj_id,
                        Cable.to_object_id == to_obj_id
                    ).first()
                    
                    if cable:
                        cable_id_map[cable_data["id"]] = cable.cable_id
        
        # Импорт сварок волокон
        if "fiber_splices" in data:
            for splice_data in data["fiber_splices"]:
                # Отобразить старые ID кабелей на новые ID
                from_cable_id = cable_id_map.get(splice_data["cable_id"])
                to_cable_id = cable_id_map.get(splice_data["splice_to_cable_id"])
                
                if from_cable_id and to_cable_id:
                    new_splice = FiberSplice(
                        cable_id=from_cable_id,
                        fiber_number=splice_data["fiber_number"],
                        splice_to_cable_id=to_cable_id,
                        splice_to_fiber=splice_data["splice_to_fiber"]
                    )
                    db.add(new_splice)
                    imported_counts["splices"] += 1
        
        db.commit()
        
        return {
            "status": "success",
            "message": "Schema imported successfully",
            "imported": imported_counts
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required field: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Import error: {str(e)}")


@router.post("/geojson")
async def import_geojson(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import network schema from GeoJSON file"""
    
    try:
        contents = await file.read()
        geojson = json.loads(contents)
        
        if geojson.get("type") != "FeatureCollection":
            raise HTTPException(status_code=400, detail="Invalid GeoJSON: must be FeatureCollection")
        
        imported_counts = {
            "objects": 0,
            "cables": 0
        }
        
        features = geojson.get("features", [])
        object_mapping = {}  # Отображение оригинальных ID на новые ID для создания кабелей
        
        # Первый проход: импорт сетевых объектов (точек)
        for feature in features:
            if feature.get("properties", {}).get("feature_type") == "network_object":
                props = feature["properties"]
                geom = feature.get("geometry", {})
                
                if geom.get("type") == "Point":
                    coords = geom.get("coordinates", [0, 0])
                    
                    # Skip if object with same name exists
                    existing = db.query(NetworkObject).filter(
                        NetworkObject.name == props["name"]
                    ).first()
                    
                    if not existing:
                        new_obj = NetworkObject(
                            name=props["name"],
                            object_type=props.get("type", "node"),
                            longitude=coords[0],
                            latitude=coords[1]
                        )
                        db.add(new_obj)
                        db.flush()  # Получить ID
                        object_mapping[props["id"]] = new_obj.network_object_id
                        imported_counts["objects"] += 1
        
        db.commit()
        
        # Второй проход: импорт кабелей (linestrings)
        for feature in features:
            if feature.get("properties", {}).get("feature_type") == "cable":
                props = feature["properties"]
                geom = feature.get("geometry", {})
                
                if geom.get("type") == "LineString":
                    coords = geom.get("coordinates", [])
                    
                    if len(coords) >= 2:
                        # Найти объекты по координатам
                        from_coords = coords[0]
                        to_coords = coords[-1]
                        
                        from_obj = db.query(NetworkObject).filter(
                            NetworkObject.longitude == from_coords[0],
                            NetworkObject.latitude == from_coords[1]
                        ).first()
                        
                        to_obj = db.query(NetworkObject).filter(
                            NetworkObject.longitude == to_coords[0],
                            NetworkObject.latitude == to_coords[1]
                        ).first()
                        
                        if from_obj and to_obj:
                            # Пропустить, если кабель с таким именем уже существует
                            existing = db.query(Cable).filter(
                                Cable.name == props["name"]
                            ).first()
                            
                            if not existing:
                                new_cable = Cable(
                                    name=props["name"],
                                    cable_type=props.get("cable_type", "optical"),
                                    fiber_count=props.get("fiber_count", 1),
                                    from_object_id=from_obj.network_object_id,
                                    to_object_id=to_obj.network_object_id,
                                    distance_km=props.get("distance_km")
                                )
                                db.add(new_cable)
                                imported_counts["cables"] += 1
        
        db.commit()
        
        return {
            "status": "success",
            "message": "GeoJSON imported successfully",
            "imported": imported_counts
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid GeoJSON file")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Import error: {str(e)}")
