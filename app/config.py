from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    app_name: str = "HackSphere"
    environment: str = "development"
    database_url: str = "sqlite:///./hacksphere.db"
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    judge0_url: str = "https://judge0-ce.p.rapidapi.com"
    judge0_api_key: str = ""
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 20
    cors_origins: str = "http://localhost:8000,http://127.0.0.1:8000"
    admin_signup_password: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

DEFAULT_SECRET_KEY = "change-me-in-production"

settings = Settings()

if settings.environment.lower() == "production" and settings.secret_key == DEFAULT_SECRET_KEY:
    raise RuntimeError(
        "Refusing to start in production: SECRET_KEY is still the default. "
        "Set a strong SECRET_KEY environment variable in your deployment."
    )
