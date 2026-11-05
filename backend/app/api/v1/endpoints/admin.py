import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.db.mongodb import get_database
from app.core.security import get_password_hash
from app.core.permissions import require_roles, UserRole
from app.core.config import settings
from app.integrations.object_storage.adapter import get_storage_adapter
from app.integrations.ocr_provider.ocr import get_ocr_provider
from app.integrations.translation_provider.indictrans2 import get_translation_service
from app.integrations.ner_provider.ner import get_ner_service
from app.integrations.llm_provider.llm import get_llm_service
from app.integrations.embedding_provider.embedder import get_embedding_provider
from app.integrations.vector_database.qdrant import get_qdrant_service
from app.pipelines.nlp.nltk_processor import NLTKProcessor
from app.services.audit_service import AuditService

router = APIRouter()


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3)
    email: str = Field(..., min_length=5)
    full_name: str
    password: str = Field(..., min_length=8)
    role: str = Field(..., description="system_administrator, intake_officer, investigating_officer, supervisory_reviewer, auditor")
    assigned_cases: List[str] = Field(default_factory=list)


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None  # active, disabled
    assigned_cases: Optional[List[str]] = None
    password: Optional[str] = None


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value])),
):
    db = get_database()
    total = await db.users.count_documents({})
    skip = (page - 1) * limit
    cursor = db.users.find({}, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(limit)

    for u in users:
        u["id"] = str(u["_id"])

    return {
        "items": users,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    req: UserCreateRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value])),
):
    db = get_database()
    existing = await db.users.find_one({"$or": [{"username": req.username}, {"email": req.email}]})
    if existing:
        raise HTTPException(status_code=400, detail="Username or Email already registered.")

    valid_roles = [r.value for r in UserRole]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")

    user_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "_id": user_id,
        "user_id": user_id,
        "username": req.username,
        "email": req.email,
        "full_name": req.full_name,
        "password_hash": get_password_hash(req.password),
        "role": req.role,
        "status": "active",
        "assigned_cases": req.assigned_cases,
        "created_at": now_iso,
        "updated_at": now_iso,
        "last_login": None,
    }
    await db.users.insert_one(user_doc)

    await AuditService.log_event(
        user_id=current_user["username"],
        action="USER_CREATED",
        resource_type="user",
        resource_id=req.username,
        outcome="SUCCESS",
        metadata={"role": req.role, "email": req.email}
    )

    del user_doc["password_hash"]
    return {"message": "User created successfully", "user": user_doc}


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    req: UserUpdateRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value])),
):
    db = get_database()
    upd = {k: v for k, v in req.dict(exclude_unset=True).items() if v is not None and k != "password"}

    if req.password:
        if len(req.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        upd["password_hash"] = get_password_hash(req.password)

    if not upd:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.users.update_one({"_id": user_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    await AuditService.log_event(
        user_id=current_user["username"],
        action="USER_UPDATED",
        resource_type="user",
        resource_id=user_id,
        outcome="SUCCESS",
        metadata={k: v for k, v in upd.items() if k != "password_hash"}
    )

    return {"message": "User updated successfully"}


@router.get("/ai-services")
async def get_ai_services_status(
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value])),
):
    """
    Comprehensive status of all AI pipeline modules, models, and integrations.
    """
    ocr_svc = get_ocr_provider()
    trans_svc = get_translation_service()
    llm_svc = get_llm_service()
    emb_svc = get_embedding_provider()
    qdrant_svc = get_qdrant_service()
    storage_svc = get_storage_adapter()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "pdf_parser": {
                "name": "PyMuPDF Digital PDF Parser",
                "version": "1.24.x",
                "status": "ready",
                "capabilities": ["text_extraction", "layout_analysis", "table_boundaries", "reading_order"],
            },
            "ocr": {
                "name": "Tesseract OCR Engine",
                "binary": settings.TESSERACT_CMD,
                "status": "ready" if ocr_svc.is_available() else "binary_not_found_in_path",
                "languages": settings.TESSERACT_LANGUAGES,
                "confidence_threshold": settings.OCR_CONFIDENCE_THRESHOLD,
            },
            "language_detection": {
                "name": "Unicode Script & Statistical Language Detector",
                "status": "ready",
                "supported": ["English (eng)", "Hindi (hin)", "Gujarati (guj)"],
            },
            "indictrans2": trans_svc.get_service_status(),
            "nltk_processor": {
                "name": "NLTK Natural Language Preprocessor",
                "status": "ready" if NLTKProcessor.is_available() else "degraded",
                "capabilities": ["punkt_sentence_tokenization", "word_tokenization", "normalization"],
            },
            "ner": {
                "name": "Government Named Entity Recognizer",
                "status": "ready",
                "categories": [
                    "Person", "Organization", "Government Department", "Location", "Address",
                    "Date", "Time", "Monetary Amount", "Phone Number", "Email Address",
                    "Reference Number", "Vehicle Identifier"
                ],
            },
            "llm": llm_svc.get_service_status(),
            "embeddings": emb_svc.get_service_status(),
            "vector_database": qdrant_svc.health_check(),
            "object_storage": storage_svc.health_check(),
        }
    }


@router.get("/system-health")
async def get_system_health(
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value])),
):
    db = get_database()
    try:
        await db.command("ping")
        db_healthy = True
    except Exception:
        db_healthy = False

    storage = get_storage_adapter()
    qdrant = get_qdrant_service()

    failed_jobs = await db.processing_jobs.count_documents({"status": "Failed"})
    active_jobs = await db.processing_jobs.count_documents({"status": "Processing"})
    queued_jobs = await db.processing_jobs.count_documents({"status": "Queued"})

    return {
        "status": "healthy" if db_healthy else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "api_server": {"status": "healthy", "version": "1.0.0"},
            "database_mongodb": {"status": "healthy" if db_healthy else "unavailable"},
            "object_storage": storage.health_check(),
            "vector_database": qdrant.health_check(),
            "message_queue": {
                "provider": "celery_rabbitmq",
                "use_local_runner": settings.USE_LOCAL_TASK_RUNNER,
                "status": "active",
            },
        },
        "queue_metrics": {
            "active_jobs": active_jobs,
            "queued_jobs": queued_jobs,
            "failed_jobs": failed_jobs,
        }
    }
