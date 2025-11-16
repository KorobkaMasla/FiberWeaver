from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database.database import engine, Base
from .routes import network_objects, cables, fiber_splices, export, import_schema, auth, reference
from .models import User, NetworkObject, Cable, Connection, FiberSplice, CableType, ObjectType
from .core.config import settings

# Создание всех таблиц в базе данных
Base.metadata.create_all(bind=engine)

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
app.include_router(reference.router, tags=["reference"])
app.include_router(network_objects.router, tags=["network_objects"])
app.include_router(cables.router, tags=["cables"])
app.include_router(fiber_splices.router, tags=["fiber_splices"])
app.include_router(export.router, tags=["export"])
app.include_router(import_schema.router, tags=["import"])


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
