from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

# используется файл бд в каталоге проекта
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../test.db'))
# проверка и создание каталога базы данных, если он не существует
os.makedirs(os.path.dirname(db_path), exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



