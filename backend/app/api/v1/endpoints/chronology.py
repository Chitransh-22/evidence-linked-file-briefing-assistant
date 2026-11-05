import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, require_roles, check_case_access, UserRole
from app.services.export_service import ExportService
from app.services.audit_service import AuditService

router = APIRouter()


class EventCreateRequest(BaseModel):
    case_id: str
    event_title: str
    description: str
    event_date: Optional[str] = None
    original_date_expression: str
    date_precision: str = "exact"
    associated_entities: List[str] = Field(default_factory=list)
    document_id: Optional[str] = None
    source_page: Optional[int] = None


class EventUpdateRequest(BaseModel):
    event_title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[str] = None
    original_date_expression: Optional[str] = None
    date_precision: Optional[str] = None
    associated_entities: Optional[List[str]] = None
    review_status: Optional[str] = None


@router.get("")
async def list_events(
    case_id: Optional[str] = None,
    entity: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    query = {}
    if case_id:
        has_access = await check_case_access(case_id, current_user)
        if not has_access:
            raise HTTPException(status_code=403, detail="Unauthorized")
        query["case_id"] = case_id
    if entity:
        query["associated_entities"] = {"$regex": entity, "$options": "i"}
    if search:
        query["$or"] = [
            {"event_title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    total = await db.events.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.events.find(query).sort([("event_date", 1), ("created_at", 1)]).skip(skip).limit(limit)
    events = await cursor.to_list(limit)

    for ev in events:
        ev["id"] = str(ev["_id"])

    return {
        "items": events,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/cases/{case_id}/chronology")
async def get_case_chronology(case_id: str, current_user: dict = Depends(get_current_user)):
    has_access = await check_case_access(case_id, current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db = get_database()
    cursor = db.events.find({"case_id": case_id}).sort([("event_date", 1), ("created_at", 1)])
    events = await cursor.to_list(200)

    for ev in events:
        ev["id"] = str(ev["_id"])

    return {"case_id": case_id, "events": events}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(
    req: EventCreateRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value]))
):
    has_access = await check_case_access(req.case_id, current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db = get_database()
    event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    event_doc = {
        "_id": event_id,
        "event_id": event_id,
        "case_id": req.case_id,
        "document_id": req.document_id,
        "event_title": req.event_title,
        "description": req.description,
        "event_date": req.event_date,
        "original_date_expression": req.original_date_expression,
        "date_precision": req.date_precision,
        "associated_entities": req.associated_entities,
        "evidence_ids": [],
        "source_page": req.source_page,
        "confidence": 1.0,  # Manual entry
        "review_status": "officer_verified",
        "created_by": current_user["username"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.events.insert_one(event_doc)

    await AuditService.log_event(
        user_id=current_user["username"],
        action="EVENT_CREATED_MANUALLY",
        resource_type="event",
        resource_id=event_id,
        outcome="SUCCESS",
        metadata={"case_id": req.case_id, "title": req.event_title}
    )

    return {"message": "Event recorded successfully", "event": event_doc}


@router.patch("/{event_id}")
async def update_event(
    event_id: str,
    req: EventUpdateRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value]))
):
    db = get_database()
    upd = {k: v for k, v in req.dict(exclude_unset=True).items() if v is not None}
    if not upd:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.events.update_one({"_id": event_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")

    await AuditService.log_event(
        user_id=current_user["username"],
        action="EVENT_UPDATED",
        resource_type="event",
        resource_id=event_id,
        outcome="SUCCESS",
        metadata=upd
    )
    return {"message": "Event updated successfully"}


@router.get("/export/csv")
async def export_chronology_csv(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    if case_id:
        query["case_id"] = case_id
    cursor = db.events.find(query).sort("event_date", 1)
    events = await cursor.to_list(1000)

    fieldnames = [
        "event_id", "case_id", "event_date", "original_date_expression",
        "date_precision", "event_title", "description", "associated_entities", "confidence", "review_status"
    ]
    csv_bytes = ExportService.generate_csv_export(events, fieldnames)

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=chronology_{case_id or 'all'}.csv"}
    )
