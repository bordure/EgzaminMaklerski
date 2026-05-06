from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from settings import Settings
import httpx, jwt, secrets

router = APIRouter()
security = HTTPBearer(auto_error=False)

cfg = Settings()

JWT_SECRET_KEY = cfg.jwt_secret_key
JWT_ALGORITHM = cfg.jwt_algorithm
ACCESS_TOKEN_EXPIRE = timedelta(hours=24)
REFRESH_TOKEN_EXPIRE = timedelta(days=7)

GOOGLE_CLIENT_ID = cfg.google_client_id
GOOGLE_CLIENT_SECRET = cfg.google_client_secret
GOOGLE_REDIRECT_URI = cfg.google_redirect_uri
FRONTEND_URL = cfg.frontend_url

class GoogleTokenRequest(BaseModel):
    code: str

class User(BaseModel):
    id: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None
    verified_email: bool | None = None
    guest: bool = False


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

def create_token(payload: dict, 
                 expires_delta: timedelta) -> str:
    payload = {
        **payload,
        "exp": datetime.now(timezone.utc) + expires_delta,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_token_pair(user: dict) -> TokenPair:
    """Generate both access and refresh tokens"""
    access_token = create_token(user, ACCESS_TOKEN_EXPIRE)
    refresh_token = create_token({"user_id": user["id"], "type": "refresh"}, REFRESH_TOKEN_EXPIRE)
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(ACCESS_TOKEN_EXPIRE.total_seconds())
    )


def verify_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_google_user_info(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user info")
        return r.json()


async def exchange_code_for_token(code: str) -> str:
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI,
    }

    async with httpx.AsyncClient() as client:
        r = await client.post(token_url, data=data)
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        return r.json()["access_token"]


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None,
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization required")
    payload = verify_jwt_token(credentials.credentials)

    db = request.app.state.db
    db["user_logins"].insert_one({
        "user_id": payload.get("user_id", payload.get("id")),
        "email": payload.get("email"),
        "guest": payload.get("guest", False),
        "login_time": datetime.now(timezone.utc),
    })
    return payload


@router.get("/google/url")
def get_google_auth_url():
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


@router.get("/google/callback")
async def google_callback(code: str, request: Request):
    """Handle Google OAuth callback"""
    access_token = await exchange_code_for_token(code)
    google_user = await get_google_user_info(access_token)

    db = request.app.state.db
    users = db["user_logins"]

    users.update_one(
        {"google_id": google_user["id"]},
        {
            "$set": {
                "google_id": google_user["id"],
                "email": google_user["email"],
                "name": google_user["name"],
                "picture": google_user["picture"],
                "verified_email": google_user["verified_email"],
                "last_login": datetime.now(timezone.utc),
            },
            "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )

    token_pair = create_token_pair(google_user)
    redirect_url = (
        f"{FRONTEND_URL}/auth/callback?"
        f"token={token_pair.access_token}&refresh={token_pair.refresh_token}"
    )
    return RedirectResponse(url=redirect_url)


@router.post("/guest", response_model=TokenPair)
def guest_login(request: Request):
    guess_id = secrets.token_urlsafe(16)
    user_data = {"id": guess_id, "guest": True}
    return create_token_pair(user_data)


@router.post("/refresh", response_model=TokenPair)
def refresh_token(request: Request):
    credentials: HTTPAuthorizationCredentials = request.headers.get("Authorization")
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = credentials.replace("Bearer ", "")
    payload = verify_jwt_token(token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_data = {"id": payload["user_id"]}
    return create_token_pair(user_data)


@router.get("/me", response_model=User)
def get_user_info(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    return {"message": "Successfully logged out"}
