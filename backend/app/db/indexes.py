import pymongo
from app.db.mongodb import get_database
from app.core.logging import logger


async def init_database_indexes():
    """Create authoritative indexes across all MongoDB collections."""
    db = get_database()
    logger.info("Initializing authoritative MongoDB indexes...")

    try:
        # Users
        await db.users.create_index([("username", pymongo.ASCENDING)], unique=True)
        await db.users.create_index([("email", pymongo.ASCENDING)], unique=True)
        await db.users.create_index([("role", pymongo.ASCENDING)])

        # Cases
        await db.cases.create_index([("case_reference", pymongo.ASCENDING)], unique=True)
        await db.cases.create_index([("status", pymongo.ASCENDING)])
        await db.cases.create_index([("created_at", pymongo.DESCENDING)])
        await db.cases.create_index([("assigned_officers", pymongo.ASCENDING)])

        # Documents
        await db.documents.create_index([("case_id", pymongo.ASCENDING)])
        await db.documents.create_index([("sha256", pymongo.ASCENDING)])
        await db.documents.create_index([("processing_status", pymongo.ASCENDING)])
        await db.documents.create_index([("created_at", pymongo.DESCENDING)])

        # Processing Jobs
        await db.processing_jobs.create_index([("document_id", pymongo.ASCENDING)])
        await db.processing_jobs.create_index([("case_id", pymongo.ASCENDING)])
        await db.processing_jobs.create_index([("status", pymongo.ASCENDING)])
        await db.processing_jobs.create_index([("started_at", pymongo.DESCENDING)])

        # Document Pages
        await db.document_pages.create_index([("document_id", pymongo.ASCENDING), ("page_number", pymongo.ASCENDING)], unique=True)

        # Document Sections
        await db.document_sections.create_index([("document_id", pymongo.ASCENDING)])

        # Entities
        await db.entities.create_index([("case_id", pymongo.ASCENDING), ("entity_name", pymongo.ASCENDING)])
        await db.entities.create_index([("entity_type", pymongo.ASCENDING)])

        # Evidence Records
        await db.evidence_records.create_index([("case_id", pymongo.ASCENDING)])
        await db.evidence_records.create_index([("document_id", pymongo.ASCENDING)])
        await db.evidence_records.create_index([("evidence_category", pymongo.ASCENDING)])
        await db.evidence_records.create_index([("verification_status", pymongo.ASCENDING)])
        await db.evidence_records.create_index([("created_at", pymongo.DESCENDING)])

        # Document Chunks
        await db.document_chunks.create_index([("document_id", pymongo.ASCENDING), ("chunk_index", pymongo.ASCENDING)])
        await db.document_chunks.create_index([("case_id", pymongo.ASCENDING)])

        # Events
        await db.events.create_index([("case_id", pymongo.ASCENDING)])
        await db.events.create_index([("event_date", pymongo.ASCENDING)])

        # Contradictions
        await db.contradictions.create_index([("case_id", pymongo.ASCENDING)])
        await db.contradictions.create_index([("status", pymongo.ASCENDING)])

        # Briefings
        await db.briefings.create_index([("case_id", pymongo.ASCENDING), ("version", pymongo.DESCENDING)])
        await db.briefings.create_index([("status", pymongo.ASCENDING)])

        # Claims
        await db.claims.create_index([("briefing_id", pymongo.ASCENDING)])
        await db.claims.create_index([("verification_status", pymongo.ASCENDING)])

        # Audit Logs
        await db.audit_logs.create_index([("timestamp", pymongo.DESCENDING)])
        await db.audit_logs.create_index([("event_id", pymongo.ASCENDING)], unique=True)
        await db.audit_logs.create_index([("user_id", pymongo.ASCENDING)])
        await db.audit_logs.create_index([("action", pymongo.ASCENDING)])
        await db.audit_logs.create_index([("resource_type", pymongo.ASCENDING), ("resource_id", pymongo.ASCENDING)])

        # Model Runs
        await db.model_runs.create_index([("job_id", pymongo.ASCENDING)])
        await db.model_runs.create_index([("document_id", pymongo.ASCENDING)])
        await db.model_runs.create_index([("pipeline_stage", pymongo.ASCENDING)])

        logger.info("Database indexes successfully verified and created.")
    except Exception as e:
        logger.error(f"Error initializing indexes: {e}")
