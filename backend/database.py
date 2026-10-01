import sys
import os
import logging
import tempfile
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config import settings

logger = logging.getLogger("nightcast_database")

DATABASE_URL = settings.DATABASE_URL
is_sqlite = False

def get_db_engine():
    global is_sqlite
    if "postgresql" in DATABASE_URL:
        import time
        max_retries = 2
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Connecting to PostgreSQL (attempt {attempt}/{max_retries})...")
                eng = create_engine(
                    DATABASE_URL,
                    pool_size=10,
                    max_overflow=5,
                    pool_pre_ping=True,
                    connect_args={"connect_timeout": 5}
                )
                # Test connection eagerly so we fail-fast and fallback to SQLite if host is unreachable
                with eng.connect() as conn:
                    conn.execute(text("SELECT 1"))
                logger.info("Connected to PostgreSQL database successfully.")
                is_sqlite = False
                return eng
            except Exception as e:
                logger.warning(f"PostgreSQL connection attempt {attempt} failed: {e}")
                if attempt < max_retries:
                    time.sleep(1)
        logger.warning("All PostgreSQL connection attempts failed. Falling back to SQLite.")
    
    is_sqlite = True
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    default_sqlite = os.path.join(backend_dir, "vidking.db")

    sqlite_args = {"check_same_thread": False, "timeout": 30}
    # In Serverless environments like Vercel, the local folder is read-only, so use /tmp
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_db = os.path.join(tempfile.gettempdir(), "vidking.db")
        return create_engine(f"sqlite:///{tmp_db}", connect_args=sqlite_args)
    
    try:
        if DATABASE_URL.startswith("sqlite:///") and not os.path.isabs(DATABASE_URL.replace("sqlite:///", "").lstrip("./")):
            db_file = os.path.join(backend_dir, os.path.basename(DATABASE_URL.replace("sqlite:///", "")))
            return create_engine(f"sqlite:///{db_file}", connect_args=sqlite_args)
        eng = create_engine(DATABASE_URL if "sqlite" in DATABASE_URL else f"sqlite:///{default_sqlite}", connect_args=sqlite_args)
        return eng
    except Exception:
        return create_engine(f"sqlite:///{default_sqlite}", connect_args=sqlite_args)

engine = get_db_engine()

if is_sqlite:
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=30000")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    try:
        if not is_sqlite:
            try:
                with engine.connect() as conn:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                    conn.commit()
            except Exception as e:
                logger.warning(f"Could not enable pgvector: {e}")
        Base.metadata.create_all(bind=engine)

        # Migration helper for SQLite / Postgres to ensure newly added columns exist
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE continue_watching ADD COLUMN backdrop_path VARCHAR"))
                conn.commit()
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"init_db handled exception: {e}")
