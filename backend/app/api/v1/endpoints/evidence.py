from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, require_roles, check_case_access, UserRole
from app.integrations.embedding_provider.embedder import get_embedding_provider
from app.integrations.vector_database.qdrant import get_qdrant_service
from app.services.export_service import ExportService
from app.services.audit_service import AuditService

router = APIRouter()


class EvidenceVerificationRequest(BaseModel):
    verification_status: str = Field(..., description="verified, rejected, flagged, human_review_required")
    notes: Optional[str] = None


class EvidenceUpdateRequest(BaseModel):
    normalized_text: Optional[str] = None
    evidence_category: Optional[str] = None
    associated_entities: Optional[List[str]] = None


@router.get("")
async def list_evidence(
    case_id: Optional[str] = None,
    document_id: Optional[str] = None,
    category: Optional[str] = None,
    entity: Optional[str] = None,
    verification_status: Optional[str] = None,
    min_confidence: Optional[float] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    query = {}
    if case_id:
        has_access = await check_case_access(case_id, current_user)
        if not has_access:
            raise HTTPException(status_code=403, detail="Unauthorized access to case evidence")
        query["case_id"] = case_id
    elif current_user.get("role") not in [UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.AUDITOR.value]:
        assigned = current_user.get("assigned_cases", [])
        if "*" not in assigned:
            query["case_id"] = {"$in": assigned}

    if document_id:
        query["document_id"] = document_id
    if category:
        query["evidence_category"] = category
    if entity:
        query["associated_entities"] = {"$regex": entity, "$options": "i"}
    if verification_status:
        query["verification_status"] = verification_status
    if min_confidence is not None:
        query["confidence"] = {"$gte": min_confidence}
    if search:
        query["$or"] = [
            {"source_excerpt": {"$regex": search, "$options": "i"}},
            {"normalized_text": {"$regex": search, "$options": "i"}},
            {"_id": {"$regex": search, "$options": "i"}},
        ]

    total = await db.evidence_records.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.evidence_records.find(query).sort("created_at", -1).skip(skip).limit(limit)
    records = await cursor.to_list(limit)

    for r in records:
        r["id"] = str(r["_id"])
        # Attach document title
        if r.get("document_id"):
            doc = await db.documents.find_one({"_id": r["document_id"]})
            r["document_title"] = doc.get("document_title", "") if doc else ""

    return {
        "items": records,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/search")
async def semantic_evidence_search(
    q: str = Query(..., min_length=2),
    case_id: Optional[str] = None,
    document_id: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    """
    Intelligent evidence retrieval combining Qdrant vector similarity and MongoDB metadata filters.
    """
    db = get_database()
    embedder = get_embedding_provider()
    qdrant = get_qdrant_service()

    query_vector = embedder.generate_embedding(q)
    vector_results = qdrant.search_semantic_evidence(
        query_vector=query_vector,
        limit=limit * 2,
        case_id=case_id,
        document_id=document_id,
    )

    enriched_results = []
    for vr in vector_results:
        payload = vr.get("payload", {})
        doc_id = payload.get("document_id")
        page_no = payload.get("page_start", 1)

        # Retrieve related evidence records or document metadata
        doc = await db.documents.find_one({"_id": doc_id})
        ev_cursor = db.evidence_records.find({"document_id": doc_id, "page_number": page_no})
        ev_items = await ev_cursor.to_list(3)

        doc_title = doc.get("document_title", "") if doc else "Document"

        if ev_items:
            for ev in ev_items:
                enriched_results.append({
                    "evidence_id": ev["_id"],
                    "excerpt": ev.get("source_excerpt"),
                    "normalized_text": ev.get("normalized_text"),
                    "document_id": doc_id,
                    "document_title": doc_title,
                    "page_number": page_no,
                    "relevance_score": vr["score"],
                    "evidence_category": ev.get("evidence_category", "Factual Finding"),
                    "associated_entities": ev.get("associated_entities", []),
                    "language": doc.get("language", "eng") if doc else "eng",
                    "verification_status": ev.get("verification_status", "unverified"),
                })
        else:
            enriched_results.append({
                "evidence_id": f"CHUNK-{vr['vector_id'][:8]}",
                "excerpt": payload.get("text", "")[:300],
                "normalized_text": payload.get("text", "")[:300],
                "document_id": doc_id,
                "document_title": doc_title,
                "page_number": page_no,
                "relevance_score": vr["score"],
                "evidence_category": "Extracted Text Chunk",
                "associated_entities": [],
                "language": doc.get("language", "eng") if doc else "eng",
                "verification_status": "unverified",
            })

    # Deduplicate and trim to limit
    seen = set()
    final_results = []
    for item in enriched_results:
        key = (item["document_id"], item["page_number"], item["excerpt"][:40])
        if key not in seen:
            seen.add(key)
            final_results.append(item)
        if len(final_results) >= limit:
            break

    return {
        "query": q,
        "total_results": len(final_results),
        "results": final_results,
    }


@router.get("/export/csv")
async def export_evidence_csv(
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    if case_id:
        query["case_id"] = case_id
    cursor = db.evidence_records.find(query).sort("created_at", -1)
    records = await cursor.to_list(1000)

    fieldnames = [
        "evidence_id", "case_id", "document_id", "page_number",
        "evidence_category", "source_excerpt", "associated_entities",
        "confidence", "verification_status", "created_at"
    ]
    csv_bytes = ExportService.generate_csv_export(records, fieldnames)

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=evidence_ledger_{case_id or 'all'}.csv"}
    )


@router.get("/{evidence_id}")
async def get_evidence(evidence_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    rec = await db.evidence_records.find_one({"_id": evidence_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    rec["id"] = str(rec["_id"])
    if rec.get("document_id"):
        doc = await db.documents.find_one({"_id": rec["document_id"]})
        rec["document_title"] = doc.get("document_title", "") if doc else ""

    return rec


@router.patch("/{evidence_id}")
async def update_evidence(
    evidence_id: str,
    req: EvidenceUpdateRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value]))
):
    db = get_database()
    upd = {k: v for k, v in req.dict(exclude_unset=True).items() if v is not None}
    if not upd:
        raise HTTPException(status_code=400, detail="No fields to update")

    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.evidence_records.update_one({"_id": evidence_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    await AuditService.log_event(
        user_id=current_user["username"],
        action="EVIDENCE_UPDATED",
        resource_type="evidence",
        resource_id=evidence_id,
        outcome="SUCCESS",
        metadata=upd
    )
    return {"message": "Evidence updated successfully"}


@router.post("/{evidence_id}/verify")
async def verify_evidence(
    evidence_id: str,
    req: EvidenceVerificationRequest,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value, UserRole.SUPERVISORY_REVIEWER.value]))
):
    db = get_database()
    rec = await db.evidence_records.find_one({"_id": evidence_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    verification_entry = {
        "verified_by": current_user["username"],
        "status": req.verification_status,
        "notes": req.notes or "",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await db.evidence_records.update_one(
        {"_id": evidence_id},
        {
            "$set": {
                "verification_status": req.verification_status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            "$push": {"verification_notes": verification_entry}
        }
    )

    await AuditService.log_event(
        user_id=current_user["username"],
        action="EVIDENCE_VERIFIED",
        resource_type="evidence",
        resource_id=evidence_id,
        outcome="SUCCESS",
        metadata={"new_status": req.verification_status, "notes": req.notes}
    )

    return {"message": "Evidence verification updated", "status": req.verification_status}


@router.get("/{evidence_id}/sources")
async def get_evidence_sources(evidence_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    rec = await db.evidence_records.find_one({"_id": evidence_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    doc = await db.documents.find_one({"_id": rec.get("document_id")})
    page = await db.document_pages.find_one({
        "document_id": rec.get("document_id"),
        "page_number": rec.get("page_number")
    })

    return {
        "evidence_id": evidence_id,
        "document": doc,
        "page": page,
        "source_excerpt": rec.get("source_excerpt"),
        "normalized_text": rec.get("normalized_text"),
        "page_number": rec.get("page_number"),
    }
