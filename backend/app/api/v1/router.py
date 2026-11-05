from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    cases,
    documents,
    jobs,
    evidence,
    entities,
    chronology,
    contradictions,
    briefings,
    audit,
    admin,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(cases.router, prefix="/cases", tags=["Cases"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Processing Jobs"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["Evidence Ledger"])
api_router.include_router(entities.router, prefix="/entities", tags=["Entities"])
api_router.include_router(chronology.router, prefix="/events", tags=["Events & Chronology"])
api_router.include_router(contradictions.router, prefix="/contradictions", tags=["Contradictions"])
api_router.include_router(briefings.router, prefix="/briefings", tags=["Briefings"])
api_router.include_router(audit.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])
