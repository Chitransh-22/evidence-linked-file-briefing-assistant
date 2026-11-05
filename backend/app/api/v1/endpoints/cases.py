import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, require_roles, check_case_access, UserRole
from app.services.audit_service import AuditService

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
        doc_count = await db.documents.count_documents({"case_id": c_id})
        evidence_count = await db.evidence_records.count_documents({"case_id": c_id})
        briefing_count = await db.briefings.count_documents({"case_id": c_id})
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
