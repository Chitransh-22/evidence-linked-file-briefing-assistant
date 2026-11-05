from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.db.mongodb import get_database
from app.core.permissions import get_current_user

router = APIRouter()


@router.get("")
async def list_entities(
    case_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    query = {}
    if case_id:
        query["case_id"] = case_id
    if entity_type:
        query["entity_type"] = entity_type
    if search:
        query["entity_name"] = {"$regex": search, "$options": "i"}

    total = await db.entities.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.entities.find(query).sort("entity_name", 1).skip(skip).limit(limit)
    items = await cursor.to_list(limit)

    for it in items:
        it["id"] = str(it["_id"])
        it["occurrence_count"] = len(it.get("source_occurrences", []))

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{entity_id}")
async def get_entity_detail(entity_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    entity = await db.entities.find_one({"_id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity record not found")

    entity["id"] = str(entity["_id"])
    name = entity.get("entity_name")

    # Find associated evidence records
    ev_cursor = db.evidence_records.find({
        "case_id": entity.get("case_id"),
        "associated_entities": {"$regex": f"^{name}$", "$options": "i"}
    })
    evidence_records = await ev_cursor.to_list(20)

    # Find associated events
    evts_cursor = db.events.find({
        "case_id": entity.get("case_id"),
        "associated_entities": {"$regex": f"^{name}$", "$options": "i"}
    })
    events = await evts_cursor.to_list(20)

    return {
        "entity": entity,
        "evidence_records": evidence_records,
        "events": events,
    }
