from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from app.db.mongodb import get_database
from app.core.permissions import require_roles, UserRole
from app.services.audit_service import AuditService
from app.services.export_service import ExportService

router = APIRouter()


@router.get("")
async def list_audit_logs(
    user: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    outcome: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.AUDITOR.value])),
):
    db = get_database()
    query = {}
    if user:
        query["user_id"] = user
    if action:
        query["action"] = action
    if resource_type:
        query["resource_type"] = resource_type
    if outcome:
        query["outcome"] = outcome

    total = await db.audit_logs.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(limit)

    for l in logs:
        l["id"] = str(l["_id"])

    return {
        "items": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/verify-chain")
async def verify_audit_hash_chain(
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.AUDITOR.value]))
):
    """
    Cryptographically verify the hash-chain integrity of the tamper-evident audit logs.
    """
    res = await AuditService.verify_chain_integrity()
    return res


@router.get("/export")
async def export_audit_logs_csv(
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.AUDITOR.value]))
):
    db = get_database()
    cursor = db.audit_logs.find().sort("timestamp", -1)
    logs = await cursor.to_list(2000)

    fieldnames = [
        "event_id", "timestamp", "user_id", "action",
        "resource_type", "resource_id", "outcome", "previous_hash", "event_hash"
    ]
    csv_bytes = ExportService.generate_csv_export(logs, fieldnames)

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tamper_evident_audit_trail.csv"}
    )
