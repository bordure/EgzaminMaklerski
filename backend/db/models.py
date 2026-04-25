from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(320), nullable=True)
    name = Column(String(255), nullable=True)
    picture = Column(String(1024), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_login = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_advice_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    answers = relationship("AnswerRecord", back_populates="user", lazy="dynamic")


class AnswerRecord(Base):
    __tablename__ = "answer_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(String(128), nullable=False)
    domain = Column(String(255), nullable=True)
    section = Column(String(255), nullable=True)
    topic = Column(String(255), nullable=True)
    is_correct = Column(Boolean, nullable=False)
    answered_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="answers")
