import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Government Document Evidence Intelligence & Briefing Management System"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "replace-with-a-secure-random-secret-key-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALGORITHM: str = "HS256"

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "gov_evidence_ledger"

    # Message Broker & Workers
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672//"
    CELERY_BROKER_URL: str = "amqp://guest:guest@localhost:5672//"
    CELERY_RESULT_BACKEND: str = "rpc://"
    USE_LOCAL_TASK_RUNNER: bool = True

    # Storage
    STORAGE_PROVIDER: str = "local"  # local, minio, s3
    LOCAL_STORAGE_PATH: str = "./storage"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_ORIGINALS: str = "gov-originals"
    MINIO_BUCKET_INTERMEDIATE: str = "gov-intermediate"
    MINIO_SECURE: bool = False

    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "evidence_embeddings"
    QDRANT_EMBEDDING_DIM: int = 384
    QDRANT_FALLBACK_LOCAL: bool = True

    # AI & Pipeline Settings
    TESSERACT_CMD: str = "tesseract"
    TESSERACT_LANGUAGES: str = "eng+hin+guj"
    OCR_CONFIDENCE_THRESHOLD: float = 60.0

    INDICTRANS2_ENABLED: bool = False
    INDICTRANS2_MODEL_PATH: str = "/models/indictrans2"
    INDICTRANS2_DEVICE: str = "cpu"

    NER_PROVIDER: str = "rule_and_regex"
    NER_CONFIDENCE_THRESHOLD: float = 0.75

    LLM_PROVIDER: str = "ollama"
    LLM_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL_NAME: str = "llama3"
    LLM_API_KEY: Optional[str] = None
    LLM_TEMPERATURE: float = 0.1
    LLM_TIMEOUT_SECONDS: int = 60

    EMBEDDING_PROVIDER: str = "sentence_transformers"
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

    # Initial Admin Bootstrap
    BOOTSTRAP_ADMIN_USERNAME: str = "admin"
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@gov.internal"
    BOOTSTRAP_ADMIN_PASSWORD: str = "AdminSecureGov2026!"
    BOOTSTRAP_ADMIN_FULLNAME: str = "Senior System Administrator"


settings = Settings()
