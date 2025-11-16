from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database.database import engine, Base, SessionLocal
from .routes import network_objects, cables, fiber_splices, export, import_schema, auth, reference, regions
from .models import User, NetworkObject, Cable, Connection, FiberSplice, Region
from .models.cable_type import CableType
from .models.object_type import ObjectType
from .core.config import settings

# Создание всех таблиц в базе данных
Base.metadata.create_all(bind=engine)

# Инициализация справочных данных (типы кабелей и объектов)
def init_reference_data():
    """Инициализировать справочные данные если их нет"""
    db = SessionLocal()
    try:
        # Инициализация типов кабелей
        if db.query(CableType).count() == 0:
            cable_types = [
                CableType(name="Оптический", fiber_count=None, color="#0087BE", description="Оптический кабель (голубой)"),
                CableType(name="Медный", fiber_count=None, color="#B87333", description="Медный кабель (медный)"),
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
        
        # Инициализация типов объектов
        if db.query(ObjectType).count() == 0:
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
    finally:
        db.close()

# Инициализировать справочные данные при запуске
init_reference_data()

app = FastAPI(
    title=settings.APP_NAME,
    description="API for documenting cable network infrastructure",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Включение маршрутов (auth должен быть первым)
app.include_router(auth.router, tags=["auth"])
app.include_router(network_objects.router, tags=["network_objects"])
app.include_router(cables.router, tags=["cables"])
app.include_router(fiber_splices.router, tags=["fiber_splices"])
app.include_router(export.router, tags=["export"])
app.include_router(import_schema.router, tags=["import"])
app.include_router(reference.router, tags=["reference"])
app.include_router(regions.router, tags=["regions"])


@app.get("/")
def read_root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
