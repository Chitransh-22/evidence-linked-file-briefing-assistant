from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.security import get_password_hash
from app.core.permissions import UserRole
from app.db.mongodb import connect_to_mongodb, close_mongodb_connection, get_database
from app.db.indexes import init_database_indexes
from app.api.v1.router import api_router
from app.services.audit_service import AuditService


async def bootstrap_initial_admin():
    """Ensure safe initial administrator bootstrap exists if no users present."""
    db = get_database()
    admin_count = await db.users.count_documents({"role": UserRole.SYSTEM_ADMINISTRATOR.value})
    if admin_count == 0:
        logger.info(f"No administrator found. Bootstrapping default administrator '{settings.BOOTSTRAP_ADMIN_USERNAME}'...")
        admin_doc = {
            "_id": "USER-ADMIN-001",
            "user_id": "USER-ADMIN-001",
            "username": settings.BOOTSTRAP_ADMIN_USERNAME,
            "email": settings.BOOTSTRAP_ADMIN_EMAIL,
            "full_name": settings.BOOTSTRAP_ADMIN_FULLNAME,
            "password_hash": get_password_hash(settings.BOOTSTRAP_ADMIN_PASSWORD),
            "role": UserRole.SYSTEM_ADMINISTRATOR.value,
            "status": "active",
            "assigned_cases": ["*"],
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
            "last_login": None,
        }
        await db.users.insert_one(admin_doc)
        logger.info("Default administrator created successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME}...")
    await connect_to_mongodb()
    await init_database_indexes()
    await bootstrap_initial_admin()
    yield
    # Shutdown
    logger.info("Shutting down application...")
    await close_mongodb_connection()


app = FastAPI(
    title=settings.APP_NAME,
    description="Government Document Evidence Intelligence & Briefing Management System - Production API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. This incident has been logged for administrative review."}
    )

# Include Versioned API Routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System Health"])
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "api_docs": "/api/docs",
        "health": "/health",
    }
