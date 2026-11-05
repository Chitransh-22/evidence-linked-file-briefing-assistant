import pytest
from app.db.mongodb import connect_to_mongodb, get_database, close_mongodb_connection
from app.services.audit_service import AuditService, compute_event_hash


@pytest.mark.asyncio
async def test_audit_hash_chain_logging_and_verification():
    await connect_to_mongodb()
    db = get_database()

    # Log 3 test events
    event1 = await AuditService.log_event("admin", "TEST_ACTION_1", "case", "CASE-01", "SUCCESS")
    event2 = await AuditService.log_event("investigator", "TEST_ACTION_2", "doc", "DOC-01", "SUCCESS")
    event3 = await AuditService.log_event("reviewer", "TEST_ACTION_3", "briefing", "BRF-01", "SUCCESS")

    assert event1 is not None
    assert event2 is not None
    assert event3 is not None

    # Verify cryptographic integrity
    verification = await AuditService.verify_chain_integrity()
    assert verification["valid"] is True
    assert verification["total_records"] >= 3

    await close_mongodb_connection()
