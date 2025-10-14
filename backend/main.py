from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from settings import Settings
from pymongo import MongoClient

cfg = Settings()

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


from routers import auth, analytics, notion, exam

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(exam.router, prefix="/exam", tags=["exam"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(notion.router, prefix="/notion", tags=["notion"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
