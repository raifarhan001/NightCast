import logging
import os
import tempfile
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

logger = logging.getLogger("vidking_database")

DATABASE_URL = settings.DATABASE_URL
is_sqlite = False

def get_db_engine():
    global is_sqlite
    if "postgresql" in DATABASE_URL:
        try:
            probe_engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 10})
            with probe_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Connected to PostgreSQL successfully.")
            return create_engine(DATABASE_URL, pool_size=20, max_overflow=10, pool_pre_ping=True)
        except Exception as e:
            logger.warning(f"PostgreSQL connection failed: {e}. Falling back to SQLite.")
    
    is_sqlite = True
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    default_sqlite = os.path.join(backend_dir, "vidking.db")

    # In Serverless environments like Vercel, the local folder is read-only, so use /tmp
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_db = os.path.join(tempfile.gettempdir(), "vidking.db")
        return create_engine(f"sqlite:///{tmp_db}", connect_args={"check_same_thread": False})
    
    try:
        if DATABASE_URL.startswith("sqlite:///") and not os.path.isabs(DATABASE_URL.replace("sqlite:///", "").lstrip("./")):
            db_file = os.path.join(backend_dir, os.path.basename(DATABASE_URL.replace("sqlite:///", "")))
            return create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
        eng = create_engine(DATABASE_URL if "sqlite" in DATABASE_URL else f"sqlite:///{default_sqlite}", connect_args={"check_same_thread": False})
        return eng
    except Exception:
        return create_engine(f"sqlite:///{default_sqlite}", connect_args={"check_same_thread": False})

engine = get_db_engine()
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
    except Exception as e:
        logger.warning(f"init_db handled exception: {e}")
