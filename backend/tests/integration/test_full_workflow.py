import asyncio
import io
import fitz
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.db.mongodb import connect_to_mongodb, get_database, close_mongodb_connection
from app.pipelines.orchestrator import DocumentPipelineOrchestrator
from app.services.briefing_service import BriefingService
from app.services.audit_service import AuditService


def create_sample_investigative_pdf() -> bytes:
    doc = fitz.open()
    page1 = doc.new_page()
    page1.insert_text(
        (50, 72),
        "SPECIAL INVESTIGATION WING - STATE REVENUE DEPARTMENT\n"
        "Reference Case: INV-2026-VAL-099\n"
        "Subject: Inspection Report of Land Records regarding Apex Infra Enterprises.\n"
        "On 14th August 2023, Deputy Collector Shri Hiren Joshi authorized an expenditure of Rs. 3,25,00,000.\n"
        "The file was dispatched under reference number F.No. REV/2023/4412.\n"
        "Inspection vehicle GJ01CD5678 was deployed to District Collectorate.",
        fontsize=11
    )
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.mark.asyncio
async def test_full_document_to_briefing_workflow():
    """
    Complete end-to-end integration test exercising all 24 sequence steps.
    """
    await connect_to_mongodb()
    db = get_database()

    # Ensure idempotency by removing any prior test artifacts
    await db.cases.delete_many({"case_reference": {"$regex": "^CR-TEST-INTEG"}})
    await db.documents.delete_many({"document_title": "Primary Inspection Report"})
    await db.document_pages.delete_many({"document_id": {"$exists": True}})
    await db.processing_jobs.delete_many({"document_id": {"$exists": True}})
    await db.evidence_ledger.delete_many({"case_id": {"$regex": "^CR-TEST"}})
    await db.chronology_events.delete_many({"case_id": {"$regex": "^CR-TEST"}})
    await db.contradictions.delete_many({"case_id": {"$regex": "^CR-TEST"}})
    await db.briefings.delete_many({"title": "Comprehensive Briefing - Valuation Audit"})

    transport = ASGITransport(app=app)
    investigator_token = create_access_token({"sub": "investigator", "role": "investigating_officer"})
    reviewer_token = create_access_token({"sub": "reviewer", "role": "supervisory_reviewer"})
    admin_token = create_access_token({"sub": "admin", "role": "system_administrator"})

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Step 1: Create Case
        case_resp = await ac.post(
            "/api/v1/cases",
            json={
                "case_reference": "CR-TEST-INTEG-001",
                "title": "Valuation and Disbursement Verification Inquiry",
                "category": "Land Revenue Audit",
                "priority": "High",
                "assigned_officers": ["investigator", "reviewer"],
            },
            headers={"Authorization": f"Bearer {investigator_token}"}
        )
        assert case_resp.status_code == 201
        case_data = case_resp.json()["case"]
        case_id = case_data["_id"]

        # Step 2: Upload Digital PDF
        pdf_bytes = create_sample_investigative_pdf()
        files = {
            "file": ("investigation_report.pdf", pdf_bytes, "application/pdf")
        }
        data = {
            "case_id": case_id,
            "document_title": "Primary Inspection Report",
            "document_category": "Inspection Report",
            "source_authority": "Revenue Inspection Wing",
        }
        upload_resp = await ac.post(
            "/api/v1/documents/upload",
            data=data,
            files=files,
            headers={"Authorization": f"Bearer {investigator_token}"}
        )
        assert upload_resp.status_code == 201
        up_data = upload_resp.json()
        doc_id = up_data["document_id"]
        job_id = up_data["job_id"]

        # Step 3 to 19: Run pipeline orchestrator directly to verify all 19 stages
        await DocumentPipelineOrchestrator.run_pipeline(job_id, doc_id, case_id, user_id="investigator")

        # Verify Document status updated
        doc_rec = await db.documents.find_one({"_id": doc_id})
        assert doc_rec["processing_status"] == "Ready for Review"
        assert doc_rec["language"] == "eng"
        assert doc_rec["page_count"] == 1

        # Verify Pages, Sections, Entities, Chunks, and Evidence Records
        pages = await db.document_pages.find({"document_id": doc_id}).to_list(10)
        assert len(pages) == 1

        evidence_records = await db.evidence_records.find({"document_id": doc_id}).to_list(10)
        assert len(evidence_records) > 0
        ev_id = evidence_records[0]["_id"]

        events = await db.events.find({"case_id": case_id}).to_list(10)
        assert len(events) > 0

        # Step 17: Semantic Retrieval
        search_resp = await ac.get(
            f"/api/v1/evidence/search?q=Apex+Infra+Enterprises&case_id={case_id}",
            headers={"Authorization": f"Bearer {investigator_token}"}
        )
        assert search_resp.status_code == 200
        search_data = search_resp.json()
        assert search_data["total_results"] > 0

        # Step 20: Briefing Generation
        briefing_resp = await ac.post(
            "/api/v1/briefings/generate",
            json={
                "case_id": case_id,
                "title": "Comprehensive Briefing on Land Record Verification",
            },
            headers={"Authorization": f"Bearer {investigator_token}"}
        )
        assert briefing_resp.status_code == 201
        briefing = briefing_resp.json()["briefing"]
        briefing_id = briefing["_id"]

        # Step 21: Claim Verification
        claims = await db.claims.find({"briefing_id": briefing_id}).to_list(10)
        assert len(claims) > 0
        claim_id = claims[0]["_id"]

        verify_resp = await ac.post(
            f"/api/v1/briefings/{briefing_id}/verify",
            json={
                "claim_id": claim_id,
                "verification_status": "Supported",
                "verification_explanation": "Cross-verified with Inspection Report page 1.",
            },
            headers={"Authorization": f"Bearer {investigator_token}"}
        )
        assert verify_resp.status_code == 200

        # Step 22: Officer Editing and Submit for Review
        edit_resp = await ac.patch(
            f"/api/v1/briefings/{briefing_id}",
            json={
                "change_note": "Added officer observations to Executive Summary",
            },
            headers={"Authorization": f"Bearer {investigator_token}"}
        )
        assert edit_resp.status_code == 200

        submit_resp = await ac.post(
            f"/api/v1/briefings/{briefing_id}/submit-review",
            headers={"Authorization": f"Bearer {investigator_token}"}
        )
        assert submit_resp.status_code == 200

        # Step 23: Supervisory Approval (Separation of duties)
        # 23a: If investigator attempts to approve own briefing, must be rejected with 403
        self_approve_resp = await ac.post(
            f"/api/v1/briefings/{briefing_id}/approve",
            headers={"Authorization": f"Bearer {investigator_token}"}
        )
        assert self_approve_resp.status_code == 403

        # 23b: Reviewer approves
        approve_resp = await ac.post(
            f"/api/v1/briefings/{briefing_id}/approve",
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        assert approve_resp.status_code == 200

        # Step 23c: Final Exports (PDF and DOCX)
        pdf_export = await ac.get(
            f"/api/v1/briefings/{briefing_id}/export/pdf",
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        assert pdf_export.status_code == 200
        assert pdf_export.headers["content-type"] == "application/pdf"
        assert len(pdf_export.content) > 1000

        docx_export = await ac.get(
            f"/api/v1/briefings/{briefing_id}/export/docx",
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        assert docx_export.status_code == 200
        assert "openxmlformats" in docx_export.headers["content-type"]
        assert len(docx_export.content) > 1000

        # Step 24: Tamper-evident Audit Trail Verification
        audit_verify = await ac.get(
            "/api/v1/audit-logs/verify-chain",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert audit_verify.status_code == 200
        chain_status = audit_verify.json()
        assert chain_status["valid"] is True
        assert chain_status["total_records"] >= 5

    await close_mongodb_connection()
