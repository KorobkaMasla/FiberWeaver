from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..models.fiber_splice import FiberSplice
from ..models.user import User
from ..schemas.fiber_splice import FiberSpliceCreate, FiberSpliceResponse
from ..core.dependencies import get_current_user

router = APIRouter(prefix="/api/fiber-splices", tags=["fiber_splices"])


@router.post("/", response_model=FiberSpliceResponse)
def create_fiber_splice(
    splice: FiberSpliceCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_splice = FiberSplice(**splice.dict())
    db.add(db_splice)
    db.commit()
    db.refresh(db_splice)
    return db_splice


@router.get("/{splice_id}", response_model=FiberSpliceResponse)
def get_fiber_splice(
    splice_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    splice = db.query(FiberSplice).filter(FiberSplice.fiber_splices_id == splice_id).first()
    if not splice:
        raise HTTPException(status_code=404, detail="Fiber splice not found")
    return splice


@router.get("/cable/{cable_id}", response_model=list[FiberSpliceResponse])
def get_cable_fiber_splices(
    cable_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    splices = db.query(FiberSplice).filter(FiberSplice.cable_id == cable_id).all()
    return splices


@router.get("/", response_model=list[FiberSpliceResponse])
def list_fiber_splices(
    skip: int = 0, 
    limit: int = 100, 
    cable_id: int = None, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(FiberSplice)
    if cable_id:
        query = query.filter(FiberSplice.cable_id == cable_id)
    return query.offset(skip).limit(limit).all()


@router.put("/{splice_id}", response_model=FiberSpliceResponse)
def update_fiber_splice(
    splice_id: int, 
    splice_update: FiberSpliceCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    splice = db.query(FiberSplice).filter(FiberSplice.fiber_splices_id == splice_id).first()
    if not splice:
        raise HTTPException(status_code=404, detail="Fiber splice not found")
    
    for key, value in splice_update.dict().items():
        setattr(splice, key, value)
    
    db.commit()
    db.refresh(splice)
    return splice


@router.delete("/{splice_id}")
def delete_fiber_splice(
    splice_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    splice = db.query(FiberSplice).filter(FiberSplice.fiber_splices_id == splice_id).first()
    if not splice:
        raise HTTPException(status_code=404, detail="Fiber splice not found")
    
    db.delete(splice)
    db.commit()
    return {"message": "Fiber splice deleted successfully"}

