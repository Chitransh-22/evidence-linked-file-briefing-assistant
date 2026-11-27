import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from app.core.logging import logger
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, require_roles, check_case_access, UserRole
from app.services.audit_service import AuditService
from app.integrations.object_storage.adapter import get_storage_adapter
from app.integrations.vector_database.qdrant import get_qdrant_service

router = APIRouter()


class CaseCreateRequest(BaseModel):
    case_reference: str = Field(..., description="Unique Case Reference (e.g. CR-2026-089)")
    title: str = Field(..., min_length=3)
    category: str = Field(default="Corruption Investigation")
    description: Optional[str] = None
    priority: str = Field(default="Normal")  # High, Normal, Urgent
    assigned_officers: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)


class CaseUpdateRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None


class CaseAssignRequest(BaseModel):
    assigned_officers: List[str]


@router.get("")
async def list_cases(
    search: Optional[str] = None,
    status: Optional[str] = None,
    officer: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    query: dict = {}

    # Case access restriction if not admin or auditor
    if current_user.get("role") not in [UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.AUDITOR.value]:
        assigned = current_user.get("assigned_cases", [])
        if "*" not in assigned:
            query["$or"] = [
                {"_id": {"$in": assigned}},
                {"assigned_officers": current_user.get("username")},
                {"created_by": current_user.get("username")}
            ]

    if search:
        query["$or"] = [
            {"case_reference": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}},
        ]
    if status:
        query["status"] = status
    if officer:
        query["assigned_officers"] = officer

    total = await db.cases.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.cases.find(query).sort("created_at", -1).skip(skip).limit(limit)
    cases = await cursor.to_list(limit)

    # Attach live counts
    result_cases = []
    for c in cases:
        c_id = str(c["_id"])
        case_keys = list(filter(None, [c_id, c.get("case_reference"), c.get("case_id")]))
        doc_count = await db.documents.count_documents({"case_id": {"$in": case_keys}})
        evidence_count = await db.evidence_records.count_documents({"case_id": {"$in": case_keys}})
        briefing_count = await db.briefings.count_documents({"case_id": {"$in": case_keys}})
        result_cases.append({
            "id": c_id,
            "case_reference": c["case_reference"],
            "title": c["title"],
            "category": c.get("category", "General"),
            "status": c.get("status", "Active"),
            "priority": c.get("priority", "Normal"),
            "assigned_officers": c.get("assigned_officers", []),
            "created_by": c.get("created_by"),
            "created_at": c.get("created_at"),
            "updated_at": c.get("updated_at"),
            "document_count": doc_count,
            "evidence_count": evidence_count,
            "briefing_status": "Briefing Generated" if briefing_count > 0 else "Pending",
        })

    return {
        "items": result_cases,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_case(
    req: CaseCreateRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value, UserRole.INTAKE_OFFICER.value]))
):
    db = get_database()
    existing = await db.cases.find_one({"case_reference": req.case_reference})
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Case with reference '{req.case_reference}' already exists."
        )

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # If no assigned officers specified, assign current user
    officers = req.assigned_officers
    if not officers:
        officers = [current_user["username"]]

    case_doc = {
        "_id": case_id,
        "case_id": case_id,
        "case_reference": req.case_reference,
        "title": req.title,
        "category": req.category,
        "description": req.description or "",
        "priority": req.priority,
        "assigned_officers": officers,
        "status": "Active",
        "tags": req.tags,
        "created_by": current_user["username"],
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    await db.cases.insert_one(case_doc)
    await db.users.update_many(
        {"username": {"$in": officers}},
        {"$addToSet": {"assigned_cases": case_id}}
    )

    await AuditService.log_event(
        user_id=current_user["username"],
        action="CASE_CREATED",
        resource_type="case",
        resource_id=case_id,
        outcome="SUCCESS",
        metadata={"case_reference": req.case_reference, "title": req.title}
    )

    return {"message": "Case created successfully", "case": case_doc}


@router.get("/{case_id}")
async def get_case_detail(case_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    case = await db.cases.find_one({"$or": [{"_id": case_id}, {"case_id": case_id}, {"case_reference": case_id}]})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    actual_case_id = case["_id"]
    has_access = await check_case_access(actual_case_id, current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Unauthorized access to this case workspace")

    # Aggregate workspace statistics
    doc_count = await db.documents.count_documents({"case_id": {"$in": [actual_case_id, case.get("case_reference"), case.get("case_id")]}})
    evidence_count = await db.evidence_records.count_documents({"case_id": {"$in": [actual_case_id, case.get("case_reference"), case.get("case_id")]}})
    event_count = await db.events.count_documents({"case_id": {"$in": [actual_case_id, case.get("case_reference"), case.get("case_id")]}})
    contradiction_count = await db.contradictions.count_documents({"case_id": {"$in": [actual_case_id, case.get("case_reference"), case.get("case_id")]}})
    briefing_count = await db.briefings.count_documents({"case_id": {"$in": [actual_case_id, case.get("case_reference"), case.get("case_id")]}})
    entity_count = await db.entities.count_documents({"case_id": {"$in": [actual_case_id, case.get("case_reference"), case.get("case_id")]}})

    latest_briefing = await db.briefings.find_one({"case_id": {"$in": [actual_case_id, case.get("case_reference"), case.get("case_id")]}}, sort=[("version", -1)])

    return {
        "case": case,
        "statistics": {
            "documents": doc_count,
            "evidence_records": evidence_count,
            "events": event_count,
            "contradictions": contradiction_count,
            "briefings": briefing_count,
            "entities": entity_count,
            "latest_briefing_status": latest_briefing.get("status") if latest_briefing else "None",
            "latest_briefing_id": latest_briefing.get("_id") if latest_briefing else None,
        }
    }


@router.patch("/{case_id}")
async def update_case(
    case_id: str,
    req: CaseUpdateRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value]))
):
    db = get_database()
    update_data = {k: v for k, v in req.dict(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.cases.update_one({"_id": case_id}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")

    await AuditService.log_event(
        user_id=current_user["username"],
        action="CASE_UPDATED",
        resource_type="case",
        resource_id=case_id,
        outcome="SUCCESS",
        metadata=update_data
    )
    return {"message": "Case updated successfully"}


@router.post("/{case_id}/assign")
async def assign_officers(
    case_id: str,
    req: CaseAssignRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.SUPERVISORY_REVIEWER.value]))
):
    db = get_database()
    res = await db.cases.update_one(
        {"_id": case_id},
        {
            "$set": {
                "assigned_officers": req.assigned_officers,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")

    await AuditService.log_event(
        user_id=current_user["username"],
        action="CASE_OFFICERS_ASSIGNED",
        resource_type="case",
        resource_id=case_id,
        outcome="SUCCESS",
        metadata={"assigned": req.assigned_officers}
    )
    return {"message": "Officers assigned successfully"}


@router.post("/{case_id}/archive")
async def archive_case(
    case_id: str,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.SUPERVISORY_REVIEWER.value]))
):
    db = get_database()
    res = await db.cases.update_one(
        {"_id": case_id},
        {"$set": {"status": "Archived", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")

    await AuditService.log_event(
        user_id=current_user["username"],
        action="CASE_ARCHIVED",
        resource_type="case",
        resource_id=case_id,
        outcome="SUCCESS"
    )
    return {"message": "Case archived successfully"}


@router.delete("/{case_id}")
async def delete_case(
    case_id: str,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value]))
):
    """
    Cascading permanent deletion of an entire case file and all associated downstream artifacts.
    Accessible strictly by System Administrator role.
    Purges:
      - Case metadata record
      - All ingested documents belonging to the case
      - All document pages, sections, and chunks
      - All vector embeddings in Qdrant (case & document scoped)
      - All physical PDF and intermediate storage files
      - All structured evidence records and chronology events
      - All contradiction records
      - All briefing drafts and claim verifications
      - All entity associations and processing jobs
      - Cleans user assigned_cases associations
    """
    db = get_database()
    case = await db.cases.find_one({
        "$or": [{"_id": case_id}, {"case_id": case_id}, {"case_reference": case_id}]
    })
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    actual_case_id = str(case["_id"])
    case_keys = list(set(filter(None, [actual_case_id, case.get("case_id"), case.get("case_reference"), case_id])))

    # 1. Find all documents belonging to this case to purge files and embeddings
    docs_cursor = db.documents.find({"case_id": {"$in": case_keys}})
    docs = await docs_cursor.to_list(1000)
    doc_ids = [d["_id"] for d in docs]

    storage = get_storage_adapter()
    qdrant = get_qdrant_service()

    # Purge physical files and vector points for each document
    for d in docs:
        try:
            storage.delete_document_files(d["_id"], d.get("storage_key"))
        except Exception as e:
            logger.warning(f"Error purging files for doc {d['_id']}: {e}")
        try:
            qdrant.delete_by_document(d["_id"])
        except Exception as e:
            logger.warning(f"Error purging vector points for doc {d['_id']}: {e}")

    # Purge any remaining case-scoped vector points
    for k in case_keys:
        try:
            qdrant.delete_by_case(k)
        except Exception as e:
            logger.warning(f"Error purging vector points for case {k}: {e}")

    # 2. Find briefings and purge claims
    briefings_cursor = db.briefings.find({"case_id": {"$in": case_keys}}, {"_id": 1})
    briefings = await briefings_cursor.to_list(500)
    briefing_ids = [str(b["_id"]) for b in briefings]

    del_claims = await db.claims.delete_many({
        "$or": [
            {"briefing_id": {"$in": briefing_ids}},
            {"case_id": {"$in": case_keys}}
        ]
    })
    del_briefings = await db.briefings.delete_many({"case_id": {"$in": case_keys}})

    # 3. Purge all related collections in cascade
    del_docs = await db.documents.delete_many({"case_id": {"$in": case_keys}})
    del_pages = await db.document_pages.delete_many({"$or": [{"case_id": {"$in": case_keys}}, {"document_id": {"$in": doc_ids}}]})
    del_sections = await db.document_sections.delete_many({"$or": [{"case_id": {"$in": case_keys}}, {"document_id": {"$in": doc_ids}}]})
    del_chunks = await db.document_chunks.delete_many({"$or": [{"case_id": {"$in": case_keys}}, {"document_id": {"$in": doc_ids}}]})
    del_evidence = await db.evidence_records.delete_many({"$or": [{"case_id": {"$in": case_keys}}, {"document_id": {"$in": doc_ids}}]})
    del_events = await db.events.delete_many({"$or": [{"case_id": {"$in": case_keys}}, {"document_id": {"$in": doc_ids}}]})
    del_contradictions = await db.contradictions.delete_many({"case_id": {"$in": case_keys}})
    del_entities = await db.entities.delete_many({"case_id": {"$in": case_keys}})
    del_jobs = await db.processing_jobs.delete_many({"$or": [{"case_id": {"$in": case_keys}}, {"document_id": {"$in": doc_ids}}]})

    # Clean user assigned_cases
    await db.users.update_many({}, {"$pull": {"assigned_cases": {"$in": case_keys}}})

    # 4. Delete the case record
    await db.cases.delete_many({"_id": actual_case_id})

    # 5. Tamper-evident audit logging
    await AuditService.log_event(
        user_id=current_user["username"],
        action="CASE_DELETED",
        resource_type="case",
        resource_id=actual_case_id,
        outcome="SUCCESS",
        metadata={
            "case_reference": case.get("case_reference"),
            "case_title": case.get("title"),
            "deleted_documents": len(docs),
            "deleted_pages": del_pages.deleted_count,
            "deleted_chunks": del_chunks.deleted_count,
            "deleted_evidence": del_evidence.deleted_count,
            "deleted_events": del_events.deleted_count,
            "deleted_briefings": del_briefings.deleted_count,
            "deleted_claims": del_claims.deleted_count,
            "deleted_by": current_user["username"],
            "role": current_user.get("role"),
        }
    )

    return {
        "message": f"Case '{case.get('case_reference', actual_case_id)} - {case.get('title', '')}' and all associated evidentiary artifacts permanently purged.",
        "case_id": actual_case_id,
        "purged": {
            "documents": del_docs.deleted_count,
            "pages": del_pages.deleted_count,
            "sections": del_sections.deleted_count,
            "chunks": del_chunks.deleted_count,
            "evidence": del_evidence.deleted_count,
            "events": del_events.deleted_count,
            "briefings": del_briefings.deleted_count,
            "claims": del_claims.deleted_count,
            "contradictions": del_contradictions.deleted_count,
            "entities": del_entities.deleted_count,
            "jobs": del_jobs.deleted_count,
        }
    }
