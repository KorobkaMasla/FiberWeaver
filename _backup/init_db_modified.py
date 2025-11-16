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
    """Create all tables and insert reference data"""
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
    print("  - cable_types")
    print("  - object_types")
    
    # Initialize reference data
    db = SessionLocal()
    
    # Check if data already exists
    if db.query(CableType).count() == 0:
        print("\nInitializing reference data...")
        
        # Cable Types
        cable_types = [
            CableType(name="ОКГ-1", fiber_count=1, description="Одноволоконный кабель (Синий)", color="0000FF"),
            CableType(name="ОКГ-2", fiber_count=2, description="Двухволоконный кабель (Оранжевый)", color="FFA500"),
            CableType(name="ОКГ-4", fiber_count=4, description="Четырехволоконный кабель (Коричневый)", color="A52A2A"),
            CableType(name="ОКГ-8", fiber_count=8, description="Восьмиволоконный кабель (Фиолетовый)", color="800080"),
            CableType(name="ОКГ-12", fiber_count=12, description="Двенадцативолоконный кабель (Черный)", color="000000"),
            CableType(name="ОКГ-24", fiber_count=24, description="Двадцатичетырехволоконный кабель (Белый)", color="FFFFFF"),
            CableType(name="ОКГ-48", fiber_count=48, description="Сорокаодноволоконный кабель (Красный)", color="FF0000"),
            CableType(name="ОКГ-96", fiber_count=96, description="Девяностошестиволоконный кабель (Зеленый)", color="008000"),
        ]
        db.add_all(cable_types)
        
        # Object Types
        object_types = [
            ObjectType(object_name="Узел", description="Общий узел сети, точка присутствия оборудования"),
            ObjectType(object_name="Муфта", description="Место сращивания (соединения) оптических кабелей"),
            ObjectType(object_name="Шкаф", description="Телекоммуникационный шкаф (наземный/настенный)"),
            ObjectType(object_name="Сплиттер", description="Устройство деления оптического сигнала (делитель)"),
            ObjectType(object_name="Абонент", description="Конечная точка подключения клиента (абонентский ввод)"),
            ObjectType(object_name="Столб", description="Опора (столб) для воздушной прокладки кабеля"),
            ObjectType(object_name="Колодец", description="Смотровой колодец кабельной канализации"),
            ObjectType(object_name="Камера", description="Камера видеонаблюдения"),
            ObjectType(object_name="Wi-Fi", description="Точка доступа Wi-Fi"),
        ]
        db.add_all(object_types)
        
        db.commit()
        print("✓ Reference data initialized successfully!")
    
    # Check if permissions exist
    if db.query(Permission).count() == 0:
        print("Initializing permissions and roles...")
        
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
    
    # Create test user if doesn't exist
    if db.query(User).filter(User.login == "admin").first() is None:
        print("\nCreating test user...")
        try:
            password_hash, salt = hash_password("admin123")
            test_user = User(
                login="admin",
                email="admin@test.local",
                password_hash=password_hash,
                salt=salt
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            
            # Assign admin role
            admin_role = db.query(Role).filter(Role.role_name == "Администратор").first()
            if admin_role:
                test_user.roles.append(admin_role)
                db.commit()
            print("✓ Test user created successfully!")
            print("  Login: admin")
            print("  Password: admin123")
        except Exception as e:
            print(f"⚠ Warning: Could not create test user: {e}")
            print("  You can create it manually via registration endpoint")
            db.rollback()
    
    db.close()

if __name__ == "__main__":
    init_db()
