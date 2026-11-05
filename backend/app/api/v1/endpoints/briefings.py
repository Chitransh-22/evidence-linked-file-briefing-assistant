from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
import io
from pydantic import BaseModel, Field

from app.db.mongodb import get_database
from app.core.permissions import get_current_user, require_roles, check_case_access, UserRole
from app.services.briefing_service import BriefingService
from app.services.export_service import ExportService
from app.services.audit_service import AuditService

router = APIRouter()


class BriefingGenerateRequest(BaseModel):
    case_id: str
    title: Optional[str] = None
    selected_sections: Optional[List[str]] = None


class BriefingUpdateRequest(BaseModel):
    title: Optional[str] = None
    section_data: Optional[Dict[str, str]] = None
    change_note: Optional[str] = None


class RegenerateSectionRequest(BaseModel):
    section_name: str


class ClaimVerifyRequest(BaseModel):
    claim_id: str
    verification_status: str = Field(..., description="Supported, Partially Supported, Conflicting Evidence, Unsupported, Requires Human Review")
    verification_explanation: Optional[str] = None


class BriefingReturnRequest(BaseModel):
    revision_notes: str


@router.get("")
async def list_briefings(
    case_id: Optional[str] = None,
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
    if status_filter:
        query["status"] = status_filter

    total = await db.briefings.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.briefings.find(query).sort("created_at", -1).skip(skip).limit(limit)
    briefings = await cursor.to_list(limit)

    for b in briefings:
        b["id"] = str(b["_id"])
        # Calculate claim verification breakdown
        claims = await db.claims.find({"briefing_id": b["_id"]}).to_list(100)
        total_claims = len(claims)
        verified_claims = sum(1 for c in claims if c.get("verification_status") in ["Supported", "Partially Supported"])
        conflicting_claims = sum(1 for c in claims if c.get("verification_status") == "Conflicting Evidence")
        b["claim_stats"] = {
            "total": total_claims,
            "supported": verified_claims,
            "conflicting": conflicting_claims,
        }

    return {
        "items": briefings,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_briefing(
    req: BriefingGenerateRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value]))
):
    has_access = await check_case_access(req.case_id, current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Unauthorized")

    briefing = await BriefingService.generate_briefing(
        case_id=req.case_id,
        title=req.title or "",
        user_id=current_user["username"],
        selected_sections=req.selected_sections,
    )
    briefing["id"] = str(briefing["_id"])
    return {"message": "Briefing generated successfully", "briefing": briefing}


@router.get("/{briefing_id}")
async def get_briefing(briefing_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    briefing = await db.briefings.find_one({"_id": briefing_id})
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    has_access = await check_case_access(briefing["case_id"], current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Unauthorized")

    briefing["id"] = str(briefing["_id"])

    # Attach claims
    claims = await db.claims.find({"briefing_id": briefing_id}).to_list(100)
    for c in claims:
        c["id"] = str(c["_id"])

    case = await db.cases.find_one({"_id": briefing["case_id"]})

    return {
        "briefing": briefing,
        "claims": claims,
        "case": case,
    }


@router.get("/{briefing_id}/claims")
async def get_briefing_claims(briefing_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    claims = await db.claims.find({"briefing_id": briefing_id}).to_list(100)
    for c in claims:
        c["id"] = str(c["_id"])
        # Attach supporting evidence details
        if c.get("supporting_evidence_ids"):
            ev = await db.evidence_records.find_one({"_id": c["supporting_evidence_ids"][0]})
            c["supporting_evidence"] = ev
    return {"briefing_id": briefing_id, "claims": claims}


@router.patch("/{briefing_id}")
async def update_briefing(
    briefing_id: str,
    req: BriefingUpdateRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value, UserRole.SUPERVISORY_REVIEWER.value]))
):
    db = get_database()
    briefing = await db.briefings.find_one({"_id": briefing_id})
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    if briefing.get("status") == "Approved":
        raise HTTPException(status_code=400, detail="Approved briefings are immutable. Generate a new revision to make changes.")

    upd = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if req.title:
        upd["title"] = req.title
    if req.section_data is not None:
        upd["section_data"] = req.section_data

    # Append to change history
    history_entry = {
        "action": "Officer Edit",
        "user_id": current_user["username"],
        "note": req.change_note or "Manual content revision",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await db.briefings.update_one(
        {"_id": briefing_id},
        {"$set": upd, "$push": {"change_history": history_entry}}
    )

    await AuditService.log_event(
        user_id=current_user["username"],
        action="BRIEFING_EDITED",
        resource_type="briefing",
        resource_id=briefing_id,
        outcome="SUCCESS",
        metadata={"note": req.change_note}
    )

    return {"message": "Briefing updated successfully"}


@router.post("/{briefing_id}/regenerate-section")
async def regenerate_briefing_section(
    briefing_id: str,
    req: RegenerateSectionRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value]))
):
    db = get_database()
    briefing = await db.briefings.find_one({"_id": briefing_id})
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    case_id = briefing["case_id"]
    case = await db.cases.find_one({"_id": case_id})
    docs = await db.documents.find({"case_id": case_id}).to_list(100)
    evidence = await db.evidence_records.find({"case_id": case_id}).to_list(100)
    events = await db.events.find({"case_id": case_id}).to_list(100)
    contradictions = await db.contradictions.find({"case_id": case_id}).to_list(50)
    entities = await db.entities.find({"case_id": case_id}).to_list(100)

    new_section_text = BriefingService._generate_section_text(
        req.section_name, case, docs, evidence, events, contradictions, entities
    )

    section_data = briefing.get("section_data", {})
    section_data[req.section_name] = new_section_text

    await db.briefings.update_one(
        {"_id": briefing_id},
        {
            "$set": {
                f"section_data.{req.section_name}": new_section_text,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            "$push": {
                "change_history": {
                    "action": f"Regenerated Section '{req.section_name}'",
                    "user_id": current_user["username"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            }
        }
    )

    await AuditService.log_event(
        user_id=current_user["username"],
        action="BRIEFING_SECTION_REGENERATED",
        resource_type="briefing",
        resource_id=briefing_id,
        outcome="SUCCESS",
        metadata={"section_name": req.section_name}
    )

    return {
        "message": f"Section '{req.section_name}' regenerated",
        "section_name": req.section_name,
        "content": new_section_text,
    }


@router.post("/{briefing_id}/verify")
async def verify_briefing_claim(
    briefing_id: str,
    req: ClaimVerifyRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value, UserRole.SUPERVISORY_REVIEWER.value]))
):
    db = get_database()
    res = await db.claims.update_one(
        {"_id": req.claim_id, "briefing_id": briefing_id},
        {
            "$set": {
                "verification_status": req.verification_status,
                "verification_explanation": req.verification_explanation or "",
                "reviewed_by": current_user["username"],
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }
        }
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found in briefing")

    await AuditService.log_event(
        user_id=current_user["username"],
        action="CLAIM_VERIFIED",
        resource_type="claim",
        resource_id=req.claim_id,
        outcome="SUCCESS",
        metadata={"briefing_id": briefing_id, "status": req.verification_status}
    )

    return {"message": "Claim verification recorded", "claim_id": req.claim_id}


@router.post("/{briefing_id}/submit-review")
async def submit_for_review(
    briefing_id: str,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value]))
):
    db = get_database()
    briefing = await db.briefings.find_one({"_id": briefing_id})
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    await db.briefings.update_one(
        {"_id": briefing_id},
        {
            "$set": {
                "status": "Under Review",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            "$push": {
                "change_history": {
                    "action": "Submitted for Supervisory Review",
                    "user_id": current_user["username"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            }
        }
    )

    await AuditService.log_event(
        user_id=current_user["username"],
        action="BRIEFING_SUBMITTED_FOR_REVIEW",
        resource_type="briefing",
        resource_id=briefing_id,
        outcome="SUCCESS"
    )

    return {"message": "Briefing submitted for supervisory review"}


@router.post("/{briefing_id}/approve")
async def approve_briefing(
    briefing_id: str,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.SUPERVISORY_REVIEWER.value]))
):
    """
    Enforces separation of duties: Investigating officer cannot self-approve their own briefing
    unless system administrator policy permits.
    """
    db = get_database()
    briefing = await db.briefings.find_one({"_id": briefing_id})
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    # Separation of duties check
    if briefing.get("created_by") == current_user["username"] and current_user.get("role") != UserRole.SYSTEM_ADMINISTRATOR.value:
        raise HTTPException(
            status_code=403,
            detail="Separation of duties violation: An investigating officer cannot approve their own briefing. Supervisory reviewer required."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.briefings.update_one(
        {"_id": briefing_id},
        {
            "$set": {
                "status": "Approved",
                "approved_by": current_user["username"],
                "approval_date": now_iso,
                "updated_at": now_iso,
            },
            "$push": {
                "change_history": {
                    "action": "Official Supervisory Approval",
                    "user_id": current_user["username"],
                    "timestamp": now_iso,
                }
            }
        }
    )

    await AuditService.log_event(
        user_id=current_user["username"],
        action="BRIEFING_APPROVED",
        resource_type="briefing",
        resource_id=briefing_id,
        outcome="SUCCESS",
        metadata={"case_id": briefing["case_id"], "version": briefing.get("version")}
    )

    return {"message": "Briefing officially approved and finalized"}


@router.post("/{briefing_id}/return")
async def return_briefing_for_revision(
    briefing_id: str,
    req: BriefingReturnRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.SUPERVISORY_REVIEWER.value]))
):
    db = get_database()
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.briefings.update_one(
        {"_id": briefing_id},
        {
            "$set": {
                "status": "Returned for Revision",
                "updated_at": now_iso,
            },
            "$push": {
                "change_history": {
                    "action": "Returned for Revision",
                    "user_id": current_user["username"],
                    "note": req.revision_notes,
                    "timestamp": now_iso,
                }
            }
        }
    )

    await AuditService.log_event(
        user_id=current_user["username"],
        action="BRIEFING_RETURNED_FOR_REVISION",
        resource_type="briefing",
        resource_id=briefing_id,
        outcome="SUCCESS",
        metadata={"notes": req.revision_notes}
    )

    return {"message": "Briefing returned for revision"}


@router.get("/{briefing_id}/export/pdf")
async def export_briefing_pdf(briefing_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    briefing = await db.briefings.find_one({"_id": briefing_id})
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    case = await db.cases.find_one({"_id": briefing["case_id"]})
    pdf_bytes = ExportService.generate_briefing_pdf(briefing, case or {})

    await AuditService.log_event(
        user_id=current_user["username"],
        action="BRIEFING_EXPORTED_PDF",
        resource_type="briefing",
        resource_id=briefing_id,
        outcome="SUCCESS"
    )

    filename = f"Briefing_{briefing.get('case_reference')}_v{briefing.get('version', 1)}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{briefing_id}/export/docx")
async def export_briefing_docx(briefing_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    briefing = await db.briefings.find_one({"_id": briefing_id})
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    case = await db.cases.find_one({"_id": briefing["case_id"]})
    docx_bytes = ExportService.generate_briefing_docx(briefing, case or {})

    await AuditService.log_event(
        user_id=current_user["username"],
        action="BRIEFING_EXPORTED_DOCX",
        resource_type="briefing",
        resource_id=briefing_id,
        outcome="SUCCESS"
    )

    filename = f"Briefing_{briefing.get('case_reference')}_v{briefing.get('version', 1)}.docx"
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
