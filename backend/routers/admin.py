"""Admin router — all endpoints require a valid JWT belonging to the admin_email."""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional
import httpx

from .auth import get_current_user
from settings import Settings

router = APIRouter()
cfg = Settings()


def _require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that raises 403 unless the authenticated user is the admin."""
    if current_user.get("email") != cfg.admin_email or not cfg.admin_email:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


@router.get("/check")
def admin_check(current_user: dict = Depends(get_current_user)):
    """Return whether the current user has admin privileges."""
    is_admin = bool(cfg.admin_email) and current_user.get("email") == cfg.admin_email
    return {"is_admin": is_admin}


@router.get("/questions")
def admin_list_questions(
    domain: Optional[str] = None,
    section: Optional[str] = None,
    topic: Optional[str] = None,
    exam_date: Optional[str] = None,
    search: Optional[str] = None,
    n: int = Query(20, gt=0, le=100),
    page: int = Query(1, ge=1),
    request: Request = None,
    _: dict = Depends(_require_admin),
):
    """Return a paginated list of all questions with optional filters."""
    db = request.app.state.db
    collection = db[cfg.collection_name]

    query: dict = {}
    if domain:
        query["domain"] = domain
    if section:
        query["section"] = section
    if topic:
        query["topic"] = topic
    if exam_date:
        query["exam_date"] = exam_date
    if search:
        query["question"] = {"$regex": search, "$options": "i"}

    skip = (page - 1) * n
    total = collection.count_documents(query)
    questions = list(collection.find(query).skip(skip).limit(n))
    for q in questions:
        q["_id"] = str(q["_id"])
    return {"questions": questions, "total": total}


@router.patch("/questions/{question_id}")
def admin_update_question(
    question_id: str,
    body: dict,
    request: Request = None,
    _: dict = Depends(_require_admin),
):
    """Update any fields on a question document."""
    db = request.app.state.db
    collection = db[cfg.collection_name]

    try:
        oid = ObjectId(question_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid question id.")

    forbidden = {"_id"}
    update_fields = {k: v for k, v in body.items() if k not in forbidden}
    if not update_fields:
        raise HTTPException(status_code=422, detail="No valid fields to update.")

    result = collection.update_one({"_id": oid}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found.")

    updated = collection.find_one({"_id": oid})
    updated["_id"] = str(updated["_id"])
    return updated


@router.get("/reports")
def admin_list_reports(
    resolved: Optional[bool] = None,
    n: int = Query(50, gt=0, le=200),
    skip: int = Query(0, ge=0),
    request: Request = None,
    _: dict = Depends(_require_admin),
):
    """Return all question reports, optionally filtered by resolved status."""
    db = request.app.state.db
    query: dict = {}
    if resolved is not None:
        query["resolved"] = resolved

    total = db["reports"].count_documents(query)
    reports = list(db["reports"].find(query).sort("_id", -1).skip(skip).limit(n))
    for r in reports:
        r["_id"] = str(r["_id"])
    return {"reports": reports, "total": total}


@router.patch("/reports/{report_id}")
def admin_update_report(
    report_id: str,
    body: dict,
    request: Request = None,
    _: dict = Depends(_require_admin),
):
    """Resolve or annotate a report. Pass resolved=true and optional admin_note."""
    db = request.app.state.db

    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid report id.")

    update_fields = {k: v for k, v in body.items() if k not in {"_id"}}
    if body.get("resolved"):
        update_fields["resolved_at"] = datetime.now(timezone.utc)

    result = db["reports"].update_one({"_id": oid}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found.")

    updated = db["reports"].find_one({"_id": oid})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/reports/{report_id}")
def admin_delete_report(
    report_id: str,
    request: Request = None,
    _: dict = Depends(_require_admin),
):
    """Permanently delete a report."""
    db = request.app.state.db

    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid report id.")

    result = db["reports"].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found.")


@router.post("/import")
async def admin_trigger_import(
    drop: bool = True,
    _: dict = Depends(_require_admin),
):
    """Proxy call to the blob_to_mongo Azure Function.

    Forwards the request to the configured Azure Function URL so the
    function key never leaves the backend.  Requires BLOB_TO_MONGO_URL
    to be set in the backend environment.
    """
    if not cfg.blob_to_mongo_url:
        raise HTTPException(
            status_code=503,
            detail="Import function is not configured (BLOB_TO_MONGO_URL is empty).",
        )

    params = {"drop": "true" if drop else "false"}
    headers = {"x-functions-key": cfg.function_key} if cfg.function_key else {}
    try:
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(cfg.blob_to_mongo_url, params=params, headers=headers)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Function returned {exc.response.status_code}: {exc.response.text[:300]}",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to reach import function: {exc}")
    return {"deleted": True}
