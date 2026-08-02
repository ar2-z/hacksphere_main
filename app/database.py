from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.database_url,
        pool_size=5,
        max_overflow=15,
        pool_timeout=60,
        pool_pre_ping=True,
        pool_recycle=300,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _ensure_round_columns():
    is_pg = "postgresql" in settings.database_url
    with engine.begin() as conn:
        cols = {c["name"] for c in inspect(engine).get_columns("rounds")}
        if "paused_at" not in cols:
            col_type = "TIMESTAMP WITH TIME ZONE" if is_pg else "DATETIME"
            conn.execute(text(f"ALTER TABLE rounds ADD COLUMN paused_at {col_type}"))
        if "total_paused_seconds" not in cols:
            conn.execute(text("ALTER TABLE rounds ADD COLUMN total_paused_seconds INTEGER NOT NULL DEFAULT 0"))


def init_db():
    from . import models
    try:
        models.Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        db.execute(text("SELECT current_phase FROM competitions LIMIT 1"))
        db.close()
    except Exception:
        is_sqlite = "sqlite" in settings.database_url
        if is_sqlite:
            import os
            db_path = settings.database_url.replace("sqlite:///", "")
            if os.path.exists(db_path):
                os.remove(db_path)
            models.Base.metadata.create_all(bind=engine)
        else:
            with engine.connect() as conn:
                conn.execute(text("DROP SCHEMA public CASCADE"))
                conn.execute(text("CREATE SCHEMA public"))
                conn.commit()
            models.Base.metadata.create_all(bind=engine)
    is_pg = "postgresql" in settings.database_url
    if is_pg:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE violations ALTER COLUMN team_id DROP NOT NULL"))
            conn.commit()
    _ensure_round_columns()
    db = SessionLocal()
    try:
        competition = db.query(models.Competition).first()
        if not competition:
            competition = models.Competition(name="HackSphere 2026", current_phase="registration")
            db.add(competition)
            db.flush()
            for phase in ["quiz", "debug"]:
                for rn in [1, 2, 3]:
                    existing = db.query(models.Round).filter(
                        models.Round.phase == phase,
                        models.Round.round_number == rn
                    ).first()
                    if not existing:
                        db.add(models.Round(
                            competition_id=competition.id,
                            phase=phase,
                            round_number=rn,
                            status="pending",
                            time_limit_minutes=15 if phase == "quiz" else 30,
                        ))
            db.commit()
    finally:
        db.close()
