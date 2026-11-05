import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response, status
from fastapi.responses import StreamingResponse
import io

from app.db.mongodb import get_database
from app.core.permissions import get_current_user, require_roles, check_case_access, UserRole
from app.integrations.object_storage.adapter import get_storage_adapter
from app.integrations.pdf_parser.parser import PDFParserService
from app.workers.tasks.pipeline_task import dispatch_processing_job
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("")
async def list_documents(
    case_id: Optional[str] = None,
    document_type: Optional[str] = None,
    language: Optional[str] = None,
    processing_status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    query: dict = {}

    if case_id:
        has_access = await check_case_access(case_id, current_user)
        if not has_access:
            raise HTTPException(status_code=403, detail="Unauthorized access to this case")
        query["case_id"] = case_id
    elif current_user.get("role") not in [UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.AUDITOR.value]:
        # Filter documents belonging to user's assigned cases
        assigned = current_user.get("assigned_cases", [])
        if "*" not in assigned:
            query["case_id"] = {"$in": assigned}

    if document_type:
        query["document_category"] = document_type
    if language:
        query["language"] = language
    if processing_status:
        query["processing_status"] = processing_status
    if search:
        query["$or"] = [
            {"document_title": {"$regex": search, "$options": "i"}},
            {"original_filename": {"$regex": search, "$options": "i"}},
            {"_id": {"$regex": search, "$options": "i"}},
        ]

    total = await db.documents.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.documents.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)

    # Attach case reference if available
    for d in docs:
        case = await db.cases.find_one({"_id": d.get("case_id")})
        d["case_reference"] = case.get("case_reference", "") if case else ""
        d["id"] = str(d["_id"])

    return {
        "items": docs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    case_id: str = Form(...),
    document_title: str = Form(...),
    document_category: str = Form(default="General Exhibit"),
    source_authority: Optional[str] = Form(default=""),
    received_date: Optional[str] = Form(default=""),
    remarks: Optional[str] = Form(default=""),
    allow_duplicate: bool = Form(default=False),
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INTAKE_OFFICER.value, UserRole.INVESTIGATING_OFFICER.value])),
):
    db = get_database()

    # 1. Verify case access
    has_access = await check_case_access(case_id, current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Unauthorized access to target case")

    # 2. Validate MIME & Extension
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file format. Only PDF files (.pdf) are permitted.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 3. Verify valid PDF structure
    is_valid, page_count, classification = PDFParserService.inspect_and_classify_pdf(file_bytes)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Corrupted or invalid PDF structure.")

    # 4. Checksum & Duplicate Detection
    sha256 = PDFParserService.calculate_sha256(file_bytes)
    existing = await db.documents.find_one({"sha256": sha256})
    duplicate_warning = None
    if existing:
        msg = f"Duplicate document detected! Document '{existing.get('document_title')}' (ID: {existing.get('_id')}) has the identical SHA-256 checksum ({sha256[:12]}...)."
        if not allow_duplicate:
            return Response(
                content=f'{{"duplicate": true, "message": "{msg}", "existing_document_id": "{existing.get("_id")}"}}',
                status_code=status.HTTP_409_CONFLICT,
                media_type="application/json"
            )
        duplicate_warning = msg

    # 5. Save Original in Object Storage Adapter
    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    storage = get_storage_adapter()
    storage_key = storage.save_original(doc_id, file_bytes, file.filename)

    now_iso = datetime.now(timezone.utc).isoformat()

    # 6. Metadata Record in MongoDB
    doc_record = {
        "_id": doc_id,
        "document_id": doc_id,
        "case_id": case_id,
        "document_title": document_title,
        "original_filename": file.filename,
        "storage_key": storage_key,
        "mime_type": "application/pdf",
        "file_size": len(file_bytes),
        "sha256": sha256,
        "document_category": document_category,
        "source_authority": source_authority or "Not Specified",
        "received_date": received_date or now_iso[:10],
        "remarks": remarks or "",
        "page_count": page_count,
        "classification": classification,
        "language": "pending_detection",
        "processing_status": "Pending Extraction",
        "duplicate_warning": duplicate_warning,
        "created_by": current_user["username"],
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.documents.insert_one(doc_record)

    # 7. Create processing job record
    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    job_record = {
        "_id": job_id,
        "job_id": job_id,
        "document_id": doc_id,
        "case_id": case_id,
        "job_type": "full_pipeline_ingestion",
        "current_stage": "Ingestion",
        "status": "Queued",
        "progress": 0,
        "retry_count": 0,
        "error": None,
        "started_at": now_iso,
        "completed_at": None,
        "worker_id": "celery_pipeline_worker",
    }
    await db.processing_jobs.insert_one(job_record)

    # 8. Dispatch async job
    dispatch_processing_job(job_id, doc_id, case_id, current_user["username"])

    # 9. Audit event
    await AuditService.log_event(
        user_id=current_user["username"],
        action="DOCUMENT_UPLOADED",
        resource_type="document",
        resource_id=doc_id,
        outcome="SUCCESS",
        metadata={
            "filename": file.filename,
            "sha256": sha256,
            "case_id": case_id,
            "job_id": job_id,
            "classification": classification,
        }
    )

    return {
        "message": "Document ingested and queued for processing successfully",
        "document_id": doc_id,
        "job_id": job_id,
        "duplicate_warning": duplicate_warning,
        "classification": classification,
        "page_count": page_count,
    }


@router.get("/{document_id}")
async def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    doc = await db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    has_access = await check_case_access(doc["case_id"], current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Unauthorized access to this document")

    case = await db.cases.find_one({"_id": doc.get("case_id")})
    doc["case_reference"] = case.get("case_reference", "") if case else ""
    doc["id"] = str(doc["_id"])
    return doc


@router.get("/{document_id}/original")
async def get_original_pdf(document_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    doc = await db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    has_access = await check_case_access(doc["case_id"], current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Unauthorized access to document PDF")

    storage = get_storage_adapter()
    try:
        pdf_bytes = storage.get_original(doc["storage_key"])
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Original document file not found in storage repository")

    await AuditService.log_event(
        user_id=current_user["username"],
        action="DOCUMENT_VIEWED_PDF",
        resource_type="document",
        resource_id=document_id,
        outcome="SUCCESS"
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={doc.get('original_filename', 'document.pdf')}"}
    )


@router.get("/{document_id}/pages")
async def get_document_pages(document_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    doc = await db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    has_access = await check_case_access(doc["case_id"], current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Unauthorized access")

    cursor = db.document_pages.find({"document_id": document_id}).sort("page_number", 1)
    pages = await cursor.to_list(500)
    return {"document_id": document_id, "pages": pages}


@router.get("/{document_id}/processing")
async def get_document_processing_status(document_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    jobs = await db.processing_jobs.find({"document_id": document_id}).sort("started_at", -1).to_list(10)
    return {"jobs": jobs}


@router.post("/{document_id}/retry")
async def retry_document_processing(
    document_id: str,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value]))
):
    db = get_database()
    doc = await db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    job_record = {
        "_id": job_id,
        "job_id": job_id,
        "document_id": document_id,
        "case_id": doc["case_id"],
        "job_type": "retry_pipeline",
        "current_stage": "Ingestion",
        "status": "Queued",
        "progress": 0,
        "retry_count": 1,
        "error": None,
        "started_at": now_iso,
        "completed_at": None,
        "worker_id": "celery_pipeline_worker",
    }
    await db.processing_jobs.insert_one(job_record)
    await db.documents.update_one({"_id": document_id}, {"$set": {"processing_status": "Processing"}})

    dispatch_processing_job(job_id, document_id, doc["case_id"], current_user["username"])

    await AuditService.log_event(
        user_id=current_user["username"],
        action="DOCUMENT_PROCESSING_RETRY_REQUESTED",
        resource_type="document",
        resource_id=document_id,
        outcome="SUCCESS",
        metadata={"new_job_id": job_id}
    )

    return {"message": "Processing retry job queued", "job_id": job_id}
