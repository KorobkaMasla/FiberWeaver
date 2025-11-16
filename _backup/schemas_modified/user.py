from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class RoleResponse(BaseModel):
    role_id: int
    role_name: str
    
    class Config:
        from_attributes = True


class PermissionResponse(BaseModel):
    permission_id: int
    permission_name: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserBase(BaseModel):
    login: str = Field(..., min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserResponse(UserBase):
    user_id: int
    created_at: datetime
    roles: Optional[List[RoleResponse]] = []
    
    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    login: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None
    roles: Optional[List[str]] = None

