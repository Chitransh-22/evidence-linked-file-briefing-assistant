import asyncio
import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from app.db.mongodb import get_database
from app.core.permissions import get_current_user, require_roles, UserRole
from app.workers.tasks.pipeline_task import dispatch_processing_job
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("")
async def list_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    case_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    query = {}
    if status_filter:
        query["status"] = status_filter
    if case_id:
        query["case_id"] = case_id

    total = await db.processing_jobs.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.processing_jobs.find(query).sort("started_at", -1).skip(skip).limit(limit)
    jobs = await cursor.to_list(limit)

    for j in jobs:
        j["id"] = str(j["_id"])
        # Fetch case reference
        if j.get("case_id"):
            c = await db.cases.find_one({"_id": j["case_id"]})
            j["case_reference"] = c.get("case_reference", "") if c else ""

    return {
        "items": jobs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    job = await db.processing_jobs.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job["id"] = str(job["_id"])
    if job.get("case_id"):
        c = await db.cases.find_one({"_id": job["case_id"]})
        job["case_reference"] = c.get("case_reference", "") if c else ""

    return job


@router.post("/{job_id}/retry")
async def retry_job(
    job_id: str,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.INVESTIGATING_OFFICER.value]))
):
    db = get_database()
    job = await db.processing_jobs.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    await db.processing_jobs.update_one(
        {"_id": job_id},
        {
            "$set": {
                "status": "Queued",
                "progress": 0,
                "current_stage": "Ingestion",
                "error": None,
                "started_at": datetime.now(timezone.utc).isoformat(),
            },
            "$inc": {"retry_count": 1}
        }
    )

    dispatch_processing_job(job_id, job["document_id"], job["case_id"], current_user["username"])

    await AuditService.log_event(
        user_id=current_user["username"],
        action="JOB_RETRIED",
        resource_type="job",
        resource_id=job_id,
        outcome="SUCCESS"
    )
    return {"message": "Job retry dispatched successfully", "job_id": job_id}


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    current_user: dict = Depends(require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.SUPERVISORY_REVIEWER.value]))
):
    db = get_database()
    res = await db.processing_jobs.update_one(
        {"_id": job_id},
        {
            "$set": {
                "status": "Cancelled",
                "error": f"Manually cancelled by {current_user['username']}",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        }
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")

    await AuditService.log_event(
        user_id=current_user["username"],
        action="JOB_CANCELLED",
        resource_type="job",
        resource_id=job_id,
        outcome="SUCCESS"
    )
    return {"message": "Job cancelled successfully"}


@router.get("/{job_id}/events")
async def stream_job_events(job_id: str):
    """
    Server-Sent Events (SSE) endpoint providing live status updates for a processing job.
    """
    db = get_database()

    async def event_generator():
        last_progress = -1
        last_stage = ""
        last_status = ""

        # Poll database up to 60 iterations (or until completed/failed)
        for _ in range(60):
            job = await db.processing_jobs.find_one({"_id": job_id})
            if not job:
                yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
                break

            cur_progress = job.get("progress", 0)
            cur_stage = job.get("current_stage", "")
            cur_status = job.get("status", "")

            if cur_progress != last_progress or cur_stage != last_stage or cur_status != last_status:
                payload = {
                    "job_id": job_id,
                    "current_stage": cur_stage,
                    "status": cur_status,
                    "progress": cur_progress,
                    "error": job.get("error"),
                    "completed_at": job.get("completed_at"),
                }
                yield f"data: {json.dumps(payload)}\n\n"
                last_progress = cur_progress
                last_stage = cur_stage
                last_status = cur_status

            if cur_status in ["Completed", "Failed", "Cancelled"]:
                break

            await asyncio.sleep(1.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )
