from misc.settings import BackendSettings
from pydantic_settings import SettingsConfigDict


class Settings(BackendSettings):
    """Backend application settings.

    All fields are defined in BackendSettings (misc/settings.py).
    Override model_config here only if the backend needs a different .env path.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

