from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    mongo_uri: str = Field(default="mongodb://localhost:27017", description="MongoDB connection URI")
    db_name: str = Field(default="exam_db", env="DB_NAME")
    collection_name: str = Field(default="questions")
    users_collection: str = Field(default="users")
    google_client_id: str = Field(...)
    google_client_secret: str = Field(...)
    google_redirect_uri: str = Field(default='http://localhost:8000/auth/google/callback')
    jwt_secret_key: str = Field(...)
    jwt_algorithm: str = Field(default="HS256")
    frontend_url: str = Field(default="http://localhost:3000", description="Frontend URL")
    analytics_token: str = Field(..., description="Token to access analytics endpoints")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")