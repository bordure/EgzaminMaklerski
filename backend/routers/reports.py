"""Reports router — any authenticated user can submit a question report."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Literal, Optional

from .auth import get_current_user

router = APIRouter()


class ReportCreate(BaseModel):
    """Payload for creating a new question report."""

    question_id: str
    question_text: str
    reason: Literal["typo", "wrong_answer", "other"]
    description: Optional[str] = None


@router.post("", status_code=201)
def submit_report(
    body: ReportCreate,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Submit a report for a question. Only non-guest authenticated users are allowed."""
    if current_user.get("guest"):
        raise HTTPException(status_code=403, detail="Guests cannot submit reports. Please log in.")
    db = request.app.state.db

    report = {
        "question_id": body.question_id,
        "question_text": body.question_text,
        "reason": body.reason,
        "description": body.description or "",
        "reported_by": current_user.get("email") or current_user.get("id"),
        "created_at": datetime.now(timezone.utc),
        "resolved": False,
        "resolved_at": None,
        "admin_note": None,
    }
    result = db["reports"].insert_one(report)
    report["_id"] = str(result.inserted_id)
    return report
