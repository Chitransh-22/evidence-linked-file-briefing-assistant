from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, require_roles, check_case_access, UserRole
from app.services.export_service import ExportService
from app.services.audit_service import AuditService

router = APIRouter()


class ContradictionReviewRequest(BaseModel):
    status: str = Field(..., description="Confirmed by officer, Rejected by officer, Needs further review, Resolved with explanation")
    officer_explanation: str = Field(..., min_length=5, description="Officer justification is mandatory")


@router.get("")
async def list_contradictions(
    case_id: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    query = {}
    if case_id:
        has_access = await check_case_access(case_id, current_user)
        if not has_access:
            raise HTTPException(status_code=403, detail="Unauthorized")
        query["case_id"] = case_id
    if category:
        query["category"] = category
    if status_filter:
        query["status"] = status_filter

    total = await db.contradictions.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.contradictions.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(limit)

    for item in items:
        item["id"] = str(item["_id"])
        # Fetch evidence A & B details
        ev_a = await db.evidence_records.find_one({"_id": item.get("evidence_id_a")})
        ev_b = await db.evidence_records.find_one({"_id": item.get("evidence_id_b")})
        item["evidence_a"] = ev_a
        item["evidence_b"] = ev_b

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{contradiction_id}")
async def get_contradiction_detail(contradiction_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    item = await db.contradictions.find_one({"_id": contradiction_id})
    if not item:
        raise HTTPException(status_code=404, detail="Contradiction record not found")

    item["id"] = str(item["_id"])
    ev_a = await db.evidence_records.find_one({"_id": item.get("evidence_id_a")})
    ev_b = await db.evidence_records.find_one({"_id": item.get("evidence_id_b")})

    doc_a = await db.documents.find_one({"_id": ev_a.get("document_id")}) if ev_a else None
    doc_b = await db.documents.find_one({"_id": ev_b.get("document_id")}) if ev_b else None

    return {
        "contradiction": item,
        "evidence_a": ev_a,
        "evidence_b": ev_b,
        "document_a": doc_a,
        "document_b": doc_b,
    }


@router.post("/{contradiction_id}/review")
async def review_contradiction(
    contradiction_id: str,
    req: ContradictionReviewRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value, UserRole.SUPERVISORY_REVIEWER.value]))
):
    db = get_database()
    item = await db.contradictions.find_one({"_id": contradiction_id})
    if not item:
        raise HTTPException(status_code=404, detail="Contradiction record not found")

    upd = {
        "status": req.status,
        "officer_explanation": req.officer_explanation,
        "reviewed_by": current_user["username"],
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contradictions.update_one({"_id": contradiction_id}, {"$set": upd})

    await AuditService.log_event(
        user_id=current_user["username"],
        action="CONTRADICTION_REVIEWED",
        resource_type="contradiction",
        resource_id=contradiction_id,
        outcome="SUCCESS",
        metadata={"decision": req.status, "explanation": req.officer_explanation}
    )

    return {"message": "Contradiction review recorded", "status": req.status}


@router.get("/export/csv")
async def export_contradictions_csv(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    if case_id:
        query["case_id"] = case_id
    cursor = db.contradictions.find(query).sort("created_at", -1)
    items = await cursor.to_list(1000)

    fieldnames = [
        "contradiction_id", "case_id", "category", "evidence_id_a", "evidence_id_b",
        "explanation", "confidence", "status", "officer_explanation", "reviewed_by", "reviewed_at"
    ]
    csv_bytes = ExportService.generate_csv_export(items, fieldnames)

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=contradictions_{case_id or 'all'}.csv"}
    )
