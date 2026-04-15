from fastapi import APIRouter, Depends, Request, HTTPException, Query
from .auth import get_current_user
import random
from settings import Settings
from pymongo import MongoClient
from typing import Optional
from datetime import datetime

router = APIRouter()
cfg = Settings()

@router.get("/topics")
def get_topics(current_user: dict = Depends(get_current_user),
               request: Request = None):
    """Return a three-level topic hierarchy: domain -> section -> list of topics."""
    db = request.app.state.db
    collection = db[cfg.collection_name]
    hierarchy = {}
    for q in collection.find({}, {"domain": 1, "section": 1, "topic": 1}):
        domain = q.get("domain") or "Unknown"
        section = q.get("section") or "Unknown"
        topic = q.get("topic") or "Unknown"
        hierarchy.setdefault(domain, {})
        hierarchy[domain].setdefault(section, set())
        hierarchy[domain][section].add(topic)
    return {d: {s: sorted(t) for s, t in secs.items()} for d, secs in hierarchy.items()}

@router.get("/questions")
def get_questions(
    domain: str = None,
    section: str = None,
    topic: str = None,
    exam_date: str = None,
    n: int = Query(10, gt=0),
    skip: int = Query(0, ge=0),
    random_questions: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Return questions filtered by domain, section, topic, and/or exam_date."""
    db = request.app.state.db
    collection = db[cfg.collection_name]
    query = {}
    if domain: query["domain"] = domain
    if section: query["section"] = section
    if topic: query["topic"] = topic
    if exam_date: query["exam_date"] = exam_date

    total = collection.count_documents(query)
    if total == 0: raise HTTPException(status_code=404, detail="No questions found")

    n = min(n, total)
    if random_questions:
        all_questions = list(collection.find(query, {"_id": 1}))
        random.shuffle(all_questions)
        ids = [q["_id"] for q in all_questions[:n]]
        questions = list(collection.find({"_id": {"$in": ids}}))
        random.shuffle(questions)
    else:
        questions = list(collection.find(query).skip(skip).limit(n))

    for q in questions: q["_id"] = str(q["_id"])
    return {"questions": questions, "total": total}

@router.get("/questions/count")
def get_questions_count(
    domain: Optional[str] = None,
    section: Optional[str] = None,
    topic: Optional[str] = None,
    exam_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Return the count of questions matching the given filters."""
    db = request.app.state.db
    collection = db[cfg.collection_name]
    query = {}
    if domain: query["domain"] = domain
    if section: query["section"] = section
    if topic: query["topic"] = topic
    if exam_date: query["exam_date"] = exam_date
    total = collection.count_documents(query)
    return {"total": total}

@router.get("/exam_dates")
def get_exam_dates(current_user: dict = Depends(get_current_user),
                   request: Request = None):
    """Return all distinct exam dates sorted chronologically."""
    db = request.app.state.db
    collection = db[cfg.collection_name]
    dates = collection.distinct("exam_date")
    sorted_dates = sorted(
        dates,
        key=lambda d: datetime.strptime(d, "%d.%m.%Y")
    )
    return {"exam_dates": sorted_dates}

@router.get("/subtopic_counts")
def get_subtopic_counts(current_user: dict = Depends(get_current_user),
                        request: Request = None):
    """Return question counts grouped by topic."""
    db = request.app.state.db
    collection = db[cfg.collection_name]
    pipeline = [
        {"$group": {"_id": "$topic", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    result = list(collection.aggregate(pipeline))
    return {"subtopic_counts": result}