from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(settings.database_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from . import models
    try:
        models.Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        db.execute("SELECT current_phase FROM competitions LIMIT 1")
        db.close()
    except Exception:
        models.Base.metadata.drop_all(bind=engine)
        models.Base.metadata.create_all(bind=engine)
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
