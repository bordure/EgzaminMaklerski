from fastapi import FastAPI, HTTPException, Query
from pymongo import MongoClient
import os
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "exam_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "questions")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

app = FastAPI(title="Exam API")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/topics")
def get_topics():
    """List all main topics and their subtopics"""
    topics = {}
    for q in collection.find({}, {"main_topic": 1, "sub_topic": 1, "exam_date": 1}):
        main = q.get("main_topic")[0] if q.get("main_topic") else "Unknown"
        sub_list = q.get("sub_topic") or []
        topics.setdefault(main, set())
        for s in sub_list:
            topics[main].add(s)
    topics = {k: list(v) for k, v in topics.items()}
    return topics

@app.get("/questions")
def get_questions(
    main_topic: Optional[str] = None,
    sub_topic: Optional[str] = None,
    exam_date: Optional[str] = None,
    n: int = Query(10, gt=0),
    skip: int = Query(0, ge=0),
    random: bool = Query(False)
):
    """
    Unified endpoint for fetching questions with flexible filtering
    - If random=True: returns random questions (useful for exams)
    - If random=False: returns ordered questions with pagination (useful for browsing)
    - Supports filtering by main_topic, sub_topic, and/or exam_date
    """
    query = {}
    
    if main_topic:
        query["main_topic"] = main_topic
    
    if sub_topic:
        query["sub_topic"] = sub_topic
        
    if exam_date:
        query["exam_date"] = exam_date
    
    total = collection.count_documents(query)
    if total == 0:
        raise HTTPException(status_code=404, detail="No questions found for given filters")
    
    n = min(n, total)
    
    if random:
        pipeline = [{"$match": query}, {"$sample": {"size": n}}]
        questions = list(collection.aggregate(pipeline))
    else:
        questions = list(collection.find(query).skip(skip).limit(n))
    
    for q in questions:
        q["_id"] = str(q["_id"])
    
    return {
        "questions": questions,
        "total": total,
        "skip": skip if not random else 0,
        "limit": n,
        "has_more": skip + n < total if not random else False,
        "random": random
    }

@app.get("/questions/count")
def get_questions_count(
    main_topic: Optional[str] = None,
    sub_topic: Optional[str] = None,
    exam_date: Optional[str] = None
):
    """Return the total count of questions for given filters"""
    query = {}
    
    if main_topic:
        query["main_topic"] = main_topic
    
    if sub_topic:
        query["sub_topic"] = sub_topic
        
    if exam_date:
        query["exam_date"] = exam_date
    
    total = collection.count_documents(query)
    return {"total": total}

@app.get("/exam_dates")
def get_exam_dates():
    """Return all unique exam_date values sorted chronologically (dd.mm.yyyy format)."""
    dates = collection.distinct("exam_date")
    sorted_dates = sorted(
        dates,
        key=lambda d: datetime.strptime(d, "%d.%m.%Y")
    )
    return {"exam_dates": sorted_dates}

@app.get("/subtopic_counts")
def get_subtopic_counts():
    """Return counts of how many questions exist per subtopic"""
    pipeline = [
        {"$unwind": "$sub_topic"},
        {"$group": {"_id": "$sub_topic", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    result = list(collection.aggregate(pipeline))
    return {"subtopic_counts": result}
