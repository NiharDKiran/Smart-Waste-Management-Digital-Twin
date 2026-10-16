from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime, timezone

Base = declarative_base()


class BinModel(Base):
    __tablename__ = "bins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    zone_id = Column(Integer, nullable=False)
    zone_name = Column(String, nullable=False)
    zone_type = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_liters = Column(Float, nullable=False, default=120.0)
    fill_level = Column(Float, nullable=False, default=0.0)
    per_hour_fill_rate = Column(Float, nullable=False, default=2.0)
    waste_type_mix = Column(JSON, nullable=False, default=dict)
    contamination_score = Column(Float, nullable=False, default=0.0)
    last_collected = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    data_source = Column(String, nullable=False, default="simulated")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class ScenarioModel(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False, default="")
    scenario_type = Column(String, nullable=False)
    parameters = Column(JSON, nullable=False, default=dict)
    baseline_metrics = Column(JSON, nullable=True)
    scenario_metrics = Column(JSON, nullable=True)
    diff_metrics = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    data_source = Column(String, nullable=False, default="simulated")


class RecommendationCache(Base):
    __tablename__ = "recommendation_cache"

    id = Column(Integer, primary_key=True, index=True)
    response_json = Column(JSON, nullable=False)
    is_cached = Column(String, nullable=False, default="false")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


def get_engine(database_url: str = "sqlite:///./ecotwin.db"):
    return create_engine(
        database_url,
        connect_args={"check_same_thread": False},
    )


def create_session(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db(engine):
    Base.metadata.create_all(bind=engine)
