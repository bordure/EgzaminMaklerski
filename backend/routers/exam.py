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
    db = request.app.state.db
    collection = db[cfg.collection_name]
    topics = {}
    for q in collection.find({}, {"main_topic": 1, "sub_topic": 1}):
        main = q.get("main_topic")[0] if q.get("main_topic") else "Unknown"
        sub_list = q.get("sub_topic") or []
        topics.setdefault(main, set())
        for s in sub_list:
            topics[main].add(s)
    return {k: list(v) for k, v in topics.items()}

@router.get("/questions")
def get_questions(
    main_topic: str = None,
    sub_topic: str = None,
    exam_date: str = None,
    n: int = Query(10, gt=0),
    skip: int = Query(0, ge=0),
    random_questions: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    db = request.app.state.db
    collection = db[cfg.collection_name]
    query = {}
    if main_topic: query["main_topic"] = main_topic
    if sub_topic: query["sub_topic"] = sub_topic
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
    main_topic: Optional[str] = None,
    sub_topic: Optional[str] = None,
    exam_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    db = request.app.state.db
    collection = db[cfg.collection_name]
    query = {}
    
    if main_topic:
        query["main_topic"] = main_topic
    
    if sub_topic:
        query["sub_topic"] = sub_topic
        
    if exam_date:
        query["exam_date"] = exam_date
    
    total = collection.count_documents(query)
    return {"total": total}

@router.get("/exam_dates")
def get_exam_dates(current_user: dict = Depends(get_current_user),
                   request: Request = None):
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
    db = request.app.state.db
    collection = db[cfg.collection_name]
    pipeline = [
        {"$unwind": "$sub_topic"},
        {"$group": {"_id": "$sub_topic", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    result = list(collection.aggregate(pipeline))
    return {"subtopic_counts": result}