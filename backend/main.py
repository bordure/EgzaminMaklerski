from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from settings import Settings
from misc.log import get_logger
from pymongo import MongoClient
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Gauge
import threading, time, httpx

cfg = Settings()
log = get_logger(__name__)

app = FastAPI(title="Egzamin Maklerski API")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
    "https://egzaminmaklerski.azurewebsites.net",
    "https://egzaminmaklerski.online",
]
if cfg.frontend_url and cfg.frontend_url not in origins:
    origins.append(cfg.frontend_url)

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

def _bootstrap_import():
    """On startup, call blob_to_mongo if the questions collection is empty."""
    if not cfg.blob_to_mongo_url:
        return
    try:
        count = db["questions"].count_documents({})
        if count > 0:
            log.info("Bootstrap import skipped — %d questions already in DB", count)
            return
        log.info("Bootstrap import: questions collection is empty, calling blob_to_mongo")
        resp = httpx.post(cfg.blob_to_mongo_url, timeout=120)
        log.info("Bootstrap import result: %s %s", resp.status_code, resp.text[:200])
    except Exception:
        log.exception("Bootstrap import failed — will retry on next restart")

threading.Thread(target=_bootstrap_import, daemon=True).start()


from routers import auth, notion, exam, admin, reports, stats
from db.database import engine, run_migrations
from db import models
import sqlalchemy.exc

def _init_sql_with_retry(max_attempts: int = 10, delay: float = 6.0):
    """Create tables and run migrations, retrying on transient Azure SQL errors.

    Azure SQL Serverless returns error 40613 while waking from auto-pause (~30 s).
    Catching OperationalError here prevents the app from crashing on cold starts.
    """
    for attempt in range(1, max_attempts + 1):
        try:
            models.Base.metadata.create_all(bind=engine)
            run_migrations()
            log.info("SQL init succeeded on attempt %d", attempt)
            return
        except sqlalchemy.exc.OperationalError as exc:
            msg = str(exc)
            transient = "40613" in msg or "40501" in msg or "connection failed" in msg.lower()
            if attempt < max_attempts and transient:
                log.warning(
                    "SQL init attempt %d/%d failed (transient), retrying in %.0f s: %s",
                    attempt, max_attempts, delay, msg[:200],
                )
                time.sleep(delay)
            else:
                log.error("SQL init failed after %d attempts: %s", attempt, msg[:400])
                return

_init_sql_with_retry()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(exam.router, prefix="/exam", tags=["exam"])
app.include_router(notion.router, prefix="/notion", tags=["notion"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(stats.router, prefix="/user", tags=["stats"])

@app.get("/health")
def health_check():
    """Return service health status."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
