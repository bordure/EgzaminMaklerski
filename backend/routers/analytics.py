from fastapi import APIRouter, Header, HTTPException, Request, Query
from datetime import datetime, timedelta

router = APIRouter()

from settings import Settings
cfg = Settings()

@router.get("/logins")
def get_login_stats(token: str = Header(None), 
                    days: int = Query(7, ge=1, le=90), 
                    request: Request = None):
    if token != cfg.analytics_token:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = request.app.state.db
    logins = db[cfg.users_collection]
    since = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"login_time": {"$gte": since}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$login_time"}},
            "total_logins": {"$sum": 1},
            "guest_count": {"$sum": {"$cond": [{"$eq": ["$guest", True]}, 1, 0]}},
            "user_count": {"$sum": {"$cond": [{"$eq": ["$guest", False]}, 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]

    results = list(logins.aggregate(pipeline))
    return {"logins": results}
