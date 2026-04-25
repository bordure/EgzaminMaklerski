from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseAppSettings(BaseSettings):
    """Shared base settings used by every application module.

    All fields can be overridden via environment variables or a .env file.
    """

    environment: Literal["dev", "prod"] = Field(
        default="dev",
        description="Runtime environment. Controls connection targets and behaviour.",
    )
    log_level: str = Field(
        default="INFO",
        description="Python logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL).",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


class ScrapperSettings(BaseAppSettings):
    """Settings for the scrapper package.

    Extends BaseAppSettings with MongoDB and Azure OpenAI fields.
    """

    mongo_uri: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB connection URI.",
    )
    azure_openai_endpoint: str = Field(
        ...,
        description="Azure OpenAI endpoint URL.",
    )
    azure_openai_key: str = Field(
        ...,
        description="Azure OpenAI API key.",
    )
    azure_openai_deployment: str = Field(
        ...,
        description="Azure OpenAI deployment/model name.",
    )
    azure_openai_api_version: str = Field(
        default="2025-04-14",
        description="Azure OpenAI API version string.",
    )


class BackendSettings(BaseAppSettings):
    """Settings for the backend service.

    Extends BaseAppSettings with MongoDB, Google OAuth, JWT, Grafana,
    and frontend configuration fields.
    """

    mongo_initdb_root_username: str = Field(
        default="",
        description="MongoDB root username (used by Docker init).",
    )
    mongo_initdb_root_password: str = Field(
        default="",
        description="MongoDB root password (used by Docker init).",
    )
    mongo_uri: str = Field(
        ...,
        description="MongoDB connection URI.",
    )
    db_name: str = Field(default="exam_db", description="MongoDB database name.")
    collection_name: str = Field(default="questions", description="Questions collection name.")
    users_collection: str = Field(default="users", description="Users collection name.")
    logins_collection: str = Field(default="user_logins", description="Login events collection name.")
    google_client_id: str = Field(..., description="Google OAuth client ID.")
    google_client_secret: str = Field(..., description="Google OAuth client secret.")
    google_redirect_uri: str = Field(
        default="http://localhost:8000/auth/google/callback",
        description="Google OAuth redirect URI.",
    )
    jwt_secret_key: str = Field(..., description="Secret key used to sign JWT tokens.")
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm.")
    frontend_url: str = Field(
        default="http://localhost:3000",
        description="Frontend URL used for OAuth redirects and CORS.",
    )
    grafana_url: str = Field(
        default="http://localhost:3001",
        description="Grafana dashboard URL.",
    )
    vite_api_url: str = Field(
        default="",
        description="Public API URL exposed to the frontend (VITE_API_URL).",
    )
    admin_email: str = Field(
        default="",
        description="Email address of the admin user. Grants access to the admin panel.",
    )
    sql_database_url: str = Field(
        default="sqlite:///./egzamin.db",
        description="Database URL for relational storage (SQLite for dev, PostgreSQL for prod).",
    )
    blob_to_mongo_url: str = Field(
        default="",
        description="Full URL of the blob_to_mongo Azure Function. Leave empty to disable.",
    )
    learning_advisor_url: str = Field(
        default="",
        description="Full URL of the learning_advisor Azure Function. Leave empty to disable.",
    )
    function_key: str = Field(
        default="",
        description="Azure Function default host key for authenticating function calls.",
    )
