from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from settings import Settings
from misc.log import get_logger
from pymongo import MongoClient
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Gauge
import threading, time

cfg = Settings()
log = get_logger(__name__)

app = FastAPI(title="Egzamin Maklerski API")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
    "https://egzaminmaklerski.azurewebsites.net",
    "https://egzaminmaklerski.online"  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(cfg.mongo_uri)
db = client[cfg.db_name]

app.state.db = db

log.info("Starting Egzamin Maklerski API (environment=%s, log_level=%s)", cfg.environment, cfg.log_level)

# ── Prometheus metrics ────────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

questions_total    = Gauge("exam_questions_total",       "Total questions in database")
users_total        = Gauge("exam_users_total",           "Total registered (non-guest) users")
google_logins_total = Gauge("exam_google_logins_total",  "Total Google logins all time")
guest_logins_total  = Gauge("exam_guest_logins_total",   "Total guest logins all time")
logins_today       = Gauge("exam_logins_today",          "Login events in the last 24 hours")

def _refresh_db_gauges():
    """Background thread: refresh DB-derived gauges every 30 seconds."""
    from datetime import datetime, timedelta, timezone
    while True:
        try:
            questions_total.set(db[cfg.collection_name].estimated_document_count())
            users_total.set(len(db[cfg.logins_collection].distinct("email", {"guest": False, "email": {"$ne": None}})))
            google_logins_total.set(db[cfg.logins_collection].count_documents({"guest": False}))
            guest_logins_total.set(db[cfg.logins_collection].count_documents({"guest": True}))
            since = datetime.now(timezone.utc) - timedelta(hours=24)
            logins_today.set(db[cfg.logins_collection].count_documents({"login_time": {"$gte": since}}))
        except Exception:
            log.exception("Error refreshing DB gauges.")
        time.sleep(30)

threading.Thread(target=_refresh_db_gauges, daemon=True).start()

# ─────────────────────────────────────────────────────────────────────────────

from routers import auth, notion, exam

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(exam.router, prefix="/exam", tags=["exam"])
app.include_router(notion.router, prefix="/notion", tags=["notion"])

@app.get("/health")
def health_check():
    """Return service health status."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
