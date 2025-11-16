from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional, List
from ..core.security import decode_token
from ..database.database import get_db
from ..models.user import User, Role

security = HTTPBearer()


async def get_current_user(
    credentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Проверяет валидность токена и возвращает текущего пользователя
    """
    token = credentials.credentials
    
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Преобразуем строку в integer
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_user_optional(
    credentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Проверяет токен, если он предоставлен, но не требует аутентификации
    """
    if credentials is None:
        return None
    
    return await get_current_user(credentials, db)


def check_permission(permission_name: str):
    """Проверяет наличие конкретного права доступа у пользователя"""
    async def verify_permission(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # Получаем роли пользователя
        user_with_roles = db.query(User).filter(User.user_id == current_user.user_id).options(
            db.joinedload(User.roles).joinedload(Role.permissions)
        ).first()
        
        if not user_with_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not found"
            )
        
        # Проверяем есть ли нужное право в ролях пользователя
        has_permission = False
        for role in user_with_roles.roles:
            for permission in role.permissions:
                if permission.permission_name == permission_name:
                    has_permission = True
                    break
            if has_permission:
                break
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission_name}' required"
            )
        
        return current_user
    
    return verify_permission

