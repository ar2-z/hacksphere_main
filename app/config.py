from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    app_name: str = "HackSphere"
    database_url: str = "sqlite:///./hacksphere.db"
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    judge0_url: str = "https://judge0-ce.p.rapidapi.com"
    judge0_api_key: str = ""
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 20
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
