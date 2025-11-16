from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional, Dict, Any, List
from .config import settings
import os
import base64

# Контекст для хеширования паролей - используем pbkdf2 вместо bcrypt для лучшей совместимости
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def generate_salt() -> str:
    """Генерирует случайный salt"""
    return base64.b64encode(os.urandom(16)).decode()


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Хеширует пароль и возвращает (хеш, соль)"""
    if salt is None:
        salt = generate_salt()
    
    # Добавляем salt к паролю перед хешированием
    salted_password = f"{salt}:{password}"
    hashed = pwd_context.hash(salted_password)
    
    return hashed, salt


def verify_password(plain_password: str, stored_salt: str, hashed_password: str) -> bool:
    """Проверяет пароль против хеша с солью"""
    salted_password = f"{stored_salt}:{plain_password}"
    return pwd_context.verify(salted_password, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Создает JWT токен доступа"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Создает refresh токен"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Декодирует JWT токен"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

