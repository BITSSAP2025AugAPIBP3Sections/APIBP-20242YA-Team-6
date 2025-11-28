"""Database configuration and models for Vendors service."""
from sqlalchemy import create_engine, Column, String, Integer, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://vendors:vendorspw@vendors-db:5432/vendors")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Vendor(Base):
    """Vendor model."""
    __tablename__ = "vendors"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, index=True, nullable=True)  # References auth service user.id
    name = Column(String, nullable=True)  # Can be null initially, vendor updates after registration
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
