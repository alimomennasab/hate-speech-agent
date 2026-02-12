import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import Column, DateTime, Integer, String, create_engine, desc
from sqlalchemy.orm import declarative_base, sessionmaker
from zoneinfo import ZoneInfo

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

connect_args = {"check_same_thread": False} if DATABASE_URL and DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Input(Base):
    __tablename__ = "inputs"
    id = Column(Integer, primary_key=True)
    content = Column(String(500), nullable=False)
    timestamp = Column(DateTime, default=datetime.now(ZoneInfo('America/Los_Angeles')))

    def __repr__(self):
        preview = (self.content[:30] + "...") if len(self.content) > 30 else self.content
        return f'<Input(id={self.id}, content="{preview}", timestamp={self.timestamp})>'


def save_input(content: str):
    """Save an input and return the created record, or None if DB unavailable."""
    if not DATABASE_URL:
        return None
    db = SessionLocal()
    try:
        row = Input(content=content)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def get_input_by_id(input_id: int):
    """Fetch a single input by id."""
    db = SessionLocal()
    try:
        return db.query(Input).filter(Input.id == input_id).first()
    finally:
        db.close()

Base.metadata.create_all(engine)

