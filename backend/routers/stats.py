from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session
import httpx

from db.database import get_db
from db import models
from routers.auth import get_current_user
from settings import Settings

router = APIRouter()
_cfg = Settings()


class AnswerPayload(BaseModel):
    question_id: str
    is_correct: bool
    domain: Optional[str] = None
    section: Optional[str] = None
    topic: Optional[str] = None


def _get_or_create_user(db: Session, current_user: dict) -> models.User:
    google_id = str(current_user.get("id", ""))
    user = db.query(models.User).filter(models.User.google_id == google_id).first()
    now = datetime.now(timezone.utc)
    if not user:
        user = models.User(
            google_id=google_id,
            email=current_user.get("email"),
            name=current_user.get("name"),
            picture=current_user.get("picture"),
            created_at=now,
            last_login=now,
        )
        db.add(user)
    else:
        user.last_login = now
        if current_user.get("email"):
            user.email = current_user["email"]
        if current_user.get("name"):
            user.name = current_user["name"]
        if current_user.get("picture"):
            user.picture = current_user["picture"]
    db.commit()
    db.refresh(user)
    return user


@router.post("/answer", status_code=201)
def record_answer(
    payload: AnswerPayload,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.get("guest"):
        raise HTTPException(status_code=403, detail="Guests cannot record answers")

    user = _get_or_create_user(db, current_user)

    record = models.AnswerRecord(
        user_id=user.id,
        question_id=payload.question_id,
        domain=payload.domain,
        section=payload.section,
        topic=payload.topic,
        is_correct=payload.is_correct,
        answered_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    return {"status": "recorded"}


@router.get("/stats")
def get_user_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _empty = {
        "total_answered": 0,
        "total_correct": 0,
        "total_wrong": 0,
        "accuracy_pct": 0.0,
        "by_domain": [],
        "by_topic": [],
    }

    if current_user.get("guest"):
        return _empty

    google_id = str(current_user.get("id", ""))
    user = db.query(models.User).filter(models.User.google_id == google_id).first()
    if not user:
        return _empty

    base_q = db.query(models.AnswerRecord).filter(
        models.AnswerRecord.user_id == user.id
    )
    total = base_q.count()
    correct = base_q.filter(models.AnswerRecord.is_correct == True).count()
    wrong = total - correct
    accuracy = round(correct / total * 100, 1) if total > 0 else 0.0

    by_domain_rows = (
        db.query(
            models.AnswerRecord.domain,
            func.count().label("answered"),
            func.sum(cast(models.AnswerRecord.is_correct, Integer)).label("correct"),
        )
        .filter(models.AnswerRecord.user_id == user.id)
        .group_by(models.AnswerRecord.domain)
        .order_by(func.count().desc())
        .all()
    )

    by_topic_rows = (
        db.query(
            models.AnswerRecord.topic,
            models.AnswerRecord.domain,
            func.count().label("answered"),
            func.sum(cast(models.AnswerRecord.is_correct, Integer)).label("correct"),
        )
        .filter(models.AnswerRecord.user_id == user.id)
        .group_by(models.AnswerRecord.topic, models.AnswerRecord.domain)
        .order_by(func.count().desc())
        .limit(20)
        .all()
    )

    def _pct(c, a):
        return round((c or 0) / a * 100, 1) if a > 0 else 0.0

    return {
        "total_answered": total,
        "total_correct": correct,
        "total_wrong": wrong,
        "accuracy_pct": accuracy,
        "by_domain": [
            {
                "domain": row.domain,
                "answered": row.answered,
                "correct": row.correct or 0,
                "accuracy_pct": _pct(row.correct, row.answered),
            }
            for row in by_domain_rows
        ],
        "by_topic": [
            {
                "topic": row.topic,
                "domain": row.domain,
                "answered": row.answered,
                "correct": row.correct or 0,
                "accuracy_pct": _pct(row.correct, row.answered),
            }
            for row in by_topic_rows
        ],
    }


@router.post("/advice")
async def get_learning_advice(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Call the learning_advisor Azure Function and return personalised study advice.

    Rate-limited to 1 request per calendar day (UTC) per user.
    Returns 429 with next_available_at when the limit is hit.
    """
    if current_user.get("guest"):
        raise HTTPException(status_code=403, detail="Guests cannot request study advice.")

    if not _cfg.learning_advisor_url:
        raise HTTPException(
            status_code=503,
            detail="Learning advisor is not configured (LEARNING_ADVISOR_URL is empty).",
        )

    user = _get_or_create_user(db, current_user)

    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.date()

    if user.last_advice_at is not None:
        last_date = user.last_advice_at.astimezone(timezone.utc).date()
        if last_date >= today_utc:
            midnight_utc = datetime(
                today_utc.year, today_utc.month, today_utc.day,
                tzinfo=timezone.utc,
            ) + timedelta(days=1)
            raise HTTPException(
                status_code=429,
                detail={
                    "message": "Limit 1 rekomendacja dziennie osiągnięty.",
                    "next_available_at": midnight_utc.isoformat(),
                },
            )

    try:
        _headers = {"x-functions-key": _cfg.function_key} if _cfg.function_key else {}
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                _cfg.learning_advisor_url,
                json={"google_id": str(current_user.get("id", "")), "name": current_user.get("name")},
                headers=_headers,
            )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Learning advisor returned {exc.response.status_code}: {exc.response.text[:300]}",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to reach learning advisor: {exc}")

    user.last_advice_at = now_utc
    db.commit()

    midnight_utc = datetime(
        today_utc.year, today_utc.month, today_utc.day,
        tzinfo=timezone.utc,
    ) + timedelta(days=1)

    return {
        "advice": data.get("advice", ""),
        "stats": data.get("stats", {}),
        "next_available_at": midnight_utc.isoformat(),
    }
