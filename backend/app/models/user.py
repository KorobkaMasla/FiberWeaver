from sqlalchemy import Column, Integer, String, DateTime, Table, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database.database import Base


# Association table для many-to-many связи между users и roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.role_id', ondelete='CASCADE'), primary_key=True)
)


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    login = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    salt = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    lockout_until = Column(DateTime, nullable=True)
    last_failed_login_time = Column(DateTime, nullable=True)
    
    # Отношение к ролям
    roles = relationship("Role", secondary=user_roles, back_populates="users")


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String, unique=True, nullable=False)
    
    # Отношение к пользователям
    users = relationship("User", secondary=user_roles, back_populates="roles")
    # Отношение к правам
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"

    permission_id = Column(Integer, primary_key=True, index=True)
    permission_name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    
    # Отношение к ролям
    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")


# Ассоциационная таблица для many-to-many связи между roles и permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.role_id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.permission_id', ondelete='CASCADE'), primary_key=True)
)
