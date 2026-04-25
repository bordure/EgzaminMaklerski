from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from settings import Settings

_cfg = Settings()

_connect_args = (
    {"check_same_thread": False}
    if _cfg.sql_database_url.startswith("sqlite")
    else {}
)

engine = create_engine(_cfg.sql_database_url, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def run_migrations():
    """Apply lightweight schema additions that create_all() won't handle for existing tables."""
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_advice_at DATETIME"))
            conn.commit()
        except Exception:
            pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
