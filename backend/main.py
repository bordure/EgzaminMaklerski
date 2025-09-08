from fastapi import FastAPI, HTTPException, Query, Depends, status, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from pymongo import MongoClient
import os
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import jwt
import httpx
from pydantic import BaseModel
import secrets
from settings import Settings
import random

cfg = Settings()

MONGO_URI = cfg.mongo_uri
DB_NAME = cfg.db_name
COLLECTION_NAME = cfg.collection_name
USERS_COLLECTION = cfg.users_collection
FRONTEND_URL = cfg.frontend_url
ANALYTICS_TOKEN = cfg.analytics_token

GOOGLE_CLIENT_ID = cfg.google_client_id
GOOGLE_CLIENT_SECRET = cfg.google_client_secret
GOOGLE_REDIRECT_URI = cfg.google_redirect_uri

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_TIME = timedelta(hours=24)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]
users_collection = db[USERS_COLLECTION]
LOGINS_COLLECTION = "user_logins"
logins_collection = db[LOGINS_COLLECTION]

app = FastAPI(title="Egzamin Maklerski API")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
    "https://egzaminmaklerski.azurewebsites.net"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

class GoogleTokenRequest(BaseModel):
    code: str

class User(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    verified_email: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

def create_jwt_token(user_data: dict) -> str:
    """Create JWT token for authenticated user"""
    payload = {
        "user_id": user_data["id"],
        "email": user_data["email"],
        "exp": datetime.utcnow() + JWT_EXPIRATION_TIME,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_google_user_info(access_token: str) -> dict:
    """Fetch user info from Google using access token"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")
        return response.json()

async def exchange_code_for_token(code: str) -> str:
    """Exchange authorization code for access token"""
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        token_data = response.json()
        return token_data["access_token"]

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    payload = verify_jwt_token(token)
    
    # Check if user exists in database
    user = users_collection.find_one({"google_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {
        "google_id": user["google_id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user["picture"]
    }

@app.get("/auth/google/url")
def get_google_auth_url():
    """Get Google OAuth2 authorization URL"""
    auth_url = (
        f"https://accounts.google.com/o/oauth2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"scope=openid email profile&"
        f"response_type=code&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return {"auth_url": auth_url}

@app.get("/auth/google/callback", response_model=TokenResponse)
async def google_callback(code: str):
    """Handle Google OAuth2 callback (GET request from Google)"""
    try:
        access_token = await exchange_code_for_token(code)
        
        google_user = await get_google_user_info(access_token)
        
        users_collection.update_one(
            {"google_id": google_user["id"]},
            {
                "$set": {
                    "google_id": google_user["id"],
                    "email": google_user["email"],
                    "name": google_user["name"],
                    "picture": google_user["picture"],
                    "verified_email": google_user["verified_email"],
                    "last_login": datetime.utcnow()
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )

        logins_collection.insert_one({
            "google_id": google_user["id"],
            "email": google_user["email"],
            "login_time": datetime.utcnow()
        })
        
        jwt_token = create_jwt_token(google_user)

        redirect_url = f"{FRONTEND_URL}/auth/callback?token={jwt_token}"
        return RedirectResponse(url=redirect_url)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

@app.get("/auth/me")
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user

@app.post("/auth/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """Logout endpoint (client should delete the token)"""
    return {"message": "Successfully logged out"}

@app.get("/analytics/logins")
def get_login_stats(
    token: str = Header(None),
    days: int = Query(7, ge=1, le=90)
):
    """Return login counts per day for the last N days (requires ANALYTICS_TOKEN header)"""
    if token != ANALYTICS_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")

    since = datetime.utcnow() - timedelta(days=days)
    pipeline = [
        {"$match": {"login_time": {"$gte": since}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$login_time"}},
                "count": {"$sum": 1},
                "unique_users": {"$addToSet": "$google_id"}
            }
        },
        {
            "$project": {
                "count": 1,
                "unique_users": {"$size": "$unique_users"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    results = list(logins_collection.aggregate(pipeline))
    return {"logins": results}

@app.get("/topics")
def get_topics(current_user: dict = Depends(get_current_user)):
    """List all main topics and their subtopics (Protected)"""
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
    random_questions: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
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
    
    if random_questions:
        all_questions = list(collection.find(query, {"_id": 1})) 
        random.shuffle(all_questions)
        selected_ids = [q["_id"] for q in all_questions[:n]]
        
        questions = list(collection.find({"_id": {"$in": selected_ids}}))
        random.shuffle(questions)
    else:
        questions = list(collection.find(query).skip(skip).limit(n))
    
    for q in questions:
        q["_id"] = str(q["_id"])
    
    return {
        "questions": questions,
        "total": total,
        "skip": skip if not random_questions else 0,
        "limit": n,
        "has_more": skip + n < total if not random_questions else False,
        "random": random_questions
    }


@app.get("/questions/count")
def get_questions_count(
    main_topic: Optional[str] = None,
    sub_topic: Optional[str] = None,
    exam_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
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
def get_exam_dates(current_user: dict = Depends(get_current_user)):
    dates = collection.distinct("exam_date")
    sorted_dates = sorted(
        dates,
        key=lambda d: datetime.strptime(d, "%d.%m.%Y")
    )
    return {"exam_dates": sorted_dates}

@app.get("/subtopic_counts")
def get_subtopic_counts(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$unwind": "$sub_topic"},
        {"$group": {"_id": "$sub_topic", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    result = list(collection.aggregate(pipeline))
    return {"subtopic_counts": result}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
