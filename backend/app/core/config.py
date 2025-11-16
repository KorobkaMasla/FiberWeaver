import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "FiberWeaver"
    APP_VERSION: str = "1.0"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Db
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    SQLALCHEMY_ECHO: bool = DEBUG
    
    # JWT Settings
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "your-secret-key-change-in-production-12345678901234567890"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # API
    API_PREFIX: str = "/api"
    API_VERSION: str = "v1"
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 100
    UPLOAD_DIR: str = os.path.join(os.path.dirname(__file__), "../../uploads")
    
    # Validation
    MAX_NAME_LENGTH: int = 255
    MAX_DESCRIPTION_LENGTH: int = 1000
    MIN_FIBER_COUNT: int = 1
    MAX_FIBER_COUNT: int = 1000
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()


os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

