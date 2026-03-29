from fastapi import APIRouter, Request, Query
from fastapi.responses import RedirectResponse
from datetime import datetime, timedelta

router = APIRouter()

from settings import Settings
cfg = Settings()

@router.get("/dashboard")
def grafana_redirect():
    """Redirect to the Grafana dashboard."""
    return RedirectResponse(url=cfg.grafana_url)

@router.get("/logins")
def get_login_stats(days: int = Query(7, ge=1, le=90), request: Request = None):
    """Return aggregated login stats for the given number of past days."""
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
