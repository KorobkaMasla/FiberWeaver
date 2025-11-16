# Backend Constants

# Database
DATABASE_URL = "sqlite:///./test.db"
SQLALCHEMY_ECHO = False

# API
API_PREFIX = "/api"
API_VERSION = "1.0"

# Аутентификация
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# CORS
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Типы кабелей
CABLE_TYPES = {
    "optical": "Оптический",
    "copper": "Медный",
}

# Типы объектов
OBJECT_TYPES = {
    "node": "Узел",
    "mufa": "Муфа",
    "cabinet": "Шкаф",
    "splitter": "Сплиттер",
    "subscriber": "Абонент",
    "pole": "Опора",
    "well": "Скважина",
    "camera": "Камера",
    "wifi": "WiFi",
}

# Валидация
MAX_NAME_LENGTH = 255
MAX_DESCRIPTION_LENGTH = 1000
MIN_FIBER_COUNT = 1
MAX_FIBER_COUNT = 1000

# Import/Export
MAX_FILE_SIZE_MB = 100
SUPPORTED_IMPORT_FORMATS = ["json", "geojson"]
SUPPORTED_EXPORT_FORMATS = ["json", "geojson", "csv"]
