#!/usr/bin/env python
"""Initialize database with all tables"""

from app.database.database import Base, engine, SessionLocal
from app.models.user import User, Role, Permission
from app.models.network_object import NetworkObject
from app.models.cable import Cable
from app.models.connection import Connection
from app.models.fiber_splice import FiberSplice
from app.models.cable_type import CableType
from app.models.object_type import ObjectType
from app.core.security import hash_password

def init_db():
    """Create all tables"""
    print("Creating database tables...")
    # Drop all tables first to ensure fresh schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✓ Database initialized successfully!")
    print("Tables created:")
    print("  - users")
    print("  - roles")
    print("  - user_roles")
    print("  - permissions")
    print("  - role_permissions")
    print("  - network_objects")
    print("  - cables")
    print("  - connections")
    print("  - fiber_splices")
    
    # Initialize permissions and roles
    db = SessionLocal()
    
    if db.query(Permission).count() == 0:
        print("\nInitializing permissions and roles...")
        
        # Permissions
        permissions = [
            Permission(permission_name="can_view_map", description="Разрешение на просмотр карты и объектов на ней"),
            Permission(permission_name="can_manage_project", description="Полный доступ к редактированию проекта (объекты, кабели, сварки, импорт/экспорт)"),
            Permission(permission_name="can_manage_users", description="Разрешение на управление пользователями и ролями"),
        ]
        db.add_all(permissions)
        db.commit()
        
        # Roles
        roles = [
            Role(role_name="Гость"),
            Role(role_name="Инженер"),
            Role(role_name="Администратор"),
        ]
        db.add_all(roles)
        db.commit()
        
        # Assign permissions to roles
        guest_role = db.query(Role).filter(Role.role_name == "Гость").first()
        engineer_role = db.query(Role).filter(Role.role_name == "Инженер").first()
        admin_role = db.query(Role).filter(Role.role_name == "Администратор").first()
        
        view_perm = db.query(Permission).filter(Permission.permission_name == "can_view_map").first()
        manage_perm = db.query(Permission).filter(Permission.permission_name == "can_manage_project").first()
        users_perm = db.query(Permission).filter(Permission.permission_name == "can_manage_users").first()
        
        # Guest has only view
        guest_role.permissions.append(view_perm)
        
        # Engineer has view and manage
        engineer_role.permissions.append(view_perm)
        engineer_role.permissions.append(manage_perm)
        
        # Admin has all
        admin_role.permissions.append(view_perm)
        admin_role.permissions.append(manage_perm)
        admin_role.permissions.append(users_perm)
        
        db.commit()
        print("✓ Permissions and roles initialized successfully!")
    
    # Initialize cable types
    if db.query(CableType).count() == 0:
        print("\nInitializing cable types...")
        cable_types = [
            # Main generic types
            CableType(name="Оптический", fiber_count=None, color="#0087BE", description="Оптический кабель (голубой)"),
            CableType(name="Медный", fiber_count=None, color="#B87333", description="Медный кабель (медный)"),
            # Specific optical types for fiber_count matching
            CableType(name="ОКГ-1", fiber_count=1, color="#0000FF", description="Одноволоконный кабель"),
            CableType(name="ОКГ-2", fiber_count=2, color="#FFA500", description="Двухволоконный кабель"),
            CableType(name="ОКГ-4", fiber_count=4, color="#A52A2A", description="Четырехволоконный кабель"),
            CableType(name="ОКГ-8", fiber_count=8, color="#800080", description="Восьмиволоконный кабель"),
            CableType(name="ОКГ-12", fiber_count=12, color="#000000", description="Двенадцативолоконный кабель"),
            CableType(name="ОКГ-24", fiber_count=24, color="#FFFFFF", description="Двадцатичетырехволоконный кабель"),
            CableType(name="ОКГ-48", fiber_count=48, color="#FF0000", description="Сорокаодноволоконный кабель"),
            CableType(name="ОКГ-96", fiber_count=96, color="#008000", description="Девяностошестиволоконный кабель"),
        ]
        db.add_all(cable_types)
        db.commit()
        print("✓ Cable types initialized successfully!")
    
    # Initialize object types
    if db.query(ObjectType).count() == 0:
        print("\nInitializing object types...")
        object_types = [
            ObjectType(name="node", display_name="Узел", emoji="⚙️"),
            ObjectType(name="coupling", display_name="Муфта", emoji="📦"),
            ObjectType(name="cabinet", display_name="Шкаф", emoji="🗃️"),
            ObjectType(name="splitter", display_name="Сплиттер", emoji="🔀"),
            ObjectType(name="subscriber", display_name="Абонент", emoji="🏠"),
            ObjectType(name="pole", display_name="Столб", emoji="⚡"),
            ObjectType(name="well", display_name="Колодец", emoji="🕳️"),
            ObjectType(name="camera", display_name="Камера", emoji="📷"),
            ObjectType(name="wifi", display_name="Wi-Fi", emoji="📡"),
        ]
        db.add_all(object_types)
        db.commit()
        print("✓ Object types initialized successfully!")
    
    db.close()
    print("\n✅ Database initialization complete!")

if __name__ == "__main__":
    init_db()

if __name__ == "__main__":
    init_db()
