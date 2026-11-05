import asyncio
import os
import sys
from datetime import datetime, timezone

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.db.mongodb import connect_to_mongodb, get_database, close_mongodb_connection
from app.core.security import get_password_hash
from app.core.permissions import UserRole
from app.db.indexes import init_database_indexes
from app.services.audit_service import AuditService


async def seed_data():
    await connect_to_mongodb()
    await init_database_indexes()
    db = get_database()

    print("--- Seeding Authoritative Government System Records ---")

    # 1. Seed Role-Based Users
    users_data = [
        {
            "_id": "USER-ADMIN-001",
            "user_id": "USER-ADMIN-001",
            "username": "admin",
            "email": "admin@gov.internal",
            "full_name": "Dr. Rajesh Sharma (Director of IT & Systems)",
            "password_hash": get_password_hash("AdminSecureGov2026!"),
            "role": UserRole.SYSTEM_ADMINISTRATOR.value,
            "status": "active",
            "assigned_cases": ["*"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None,
        },
        {
            "_id": "USER-INTAKE-001",
            "user_id": "USER-INTAKE-001",
            "username": "intake_officer",
            "email": "intake@gov.internal",
            "full_name": "Smt. Priya Patel (Central Registry Ingestion Officer)",
            "password_hash": get_password_hash("OfficerGov2026!"),
            "role": UserRole.INTAKE_OFFICER.value,
            "status": "active",
            "assigned_cases": ["CASE-2026-GUJ-042"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None,
        },
        {
            "_id": "USER-INV-001",
            "user_id": "USER-INV-001",
            "username": "investigator",
            "email": "investigator@gov.internal",
            "full_name": "Inspector Vikramaditya Mehta (Chief Investigating Officer)",
            "password_hash": get_password_hash("OfficerGov2026!"),
            "role": UserRole.INVESTIGATING_OFFICER.value,
            "status": "active",
            "assigned_cases": ["CASE-2026-GUJ-042"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None,
        },
        {
            "_id": "USER-REV-001",
            "user_id": "USER-REV-001",
            "username": "reviewer",
            "email": "reviewer@gov.internal",
            "full_name": "Shri Arvind Swaminathan (Supervisory Review Commissioner)",
            "password_hash": get_password_hash("OfficerGov2026!"),
            "role": UserRole.SUPERVISORY_REVIEWER.value,
            "status": "active",
            "assigned_cases": ["CASE-2026-GUJ-042"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None,
        },
        {
            "_id": "USER-AUDIT-001",
            "user_id": "USER-AUDIT-001",
            "username": "auditor",
            "email": "auditor@gov.internal",
            "full_name": "Ms. Ananya Sengupta (Independent Vigilance Auditor)",
            "password_hash": get_password_hash("OfficerGov2026!"),
            "role": UserRole.AUDITOR.value,
            "status": "active",
            "assigned_cases": ["*"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None,
        },
    ]

    for u in users_data:
        await db.users.update_one({"username": u["username"]}, {"$set": u}, upsert=True)
    print(f"Seeded {len(users_data)} role-based officer accounts.")

    # 2. Seed Primary Demonstration Case
    case_id = "CASE-2026-GUJ-042"
    case_doc = {
        "_id": case_id,
        "case_id": case_id,
        "case_reference": "CR-2026-GUJ-042",
        "title": "Special Inquiry into Infrastructure Land Acquisition & Revenue Records (Sanand Block)",
        "category": "Land Revenue & Procurement Irregularities",
        "description": "Comprehensive document intelligence inquiry into discrepancies in registry deeds, non-agricultural land conversion permissions, and vendor payments involving Sanand Industrial Corridor development.",
        "priority": "High",
        "assigned_officers": ["investigator", "reviewer", "intake_officer"],
        "status": "Active",
        "tags": ["LandAcquisition", "RevenueDepartment", "Sanand", "ValuationAudit"],
        "created_by": "investigator",
        "created_at": "2026-02-10T09:30:00Z",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.cases.update_one({"_id": case_id}, {"$set": case_doc}, upsert=True)
    print("Seeded demonstration Case: CR-2026-GUJ-042")

    # 3. Seed Demonstrative Documents (English, Gujarati, Hindi)
    doc_1 = {
        "_id": "DOC-2026-ENG-001",
        "document_id": "DOC-2026-ENG-001",
        "case_id": case_id,
        "document_title": "Inter-Departmental Audit Report on Survey Parcel 412/A",
        "original_filename": "Audit_Report_Survey_412A.pdf",
        "storage_key": "DOC-2026-ENG-001_Audit_Report_Survey_412A.pdf",
        "mime_type": "application/pdf",
        "file_size": 184520,
        "sha256": "4b227777d4da1fcbc11e2c5b40f8e49b80eec95627685645b7e289f8d169d2a4",
        "document_category": "Official Audit Report",
        "source_authority": "Office of the Principal Accountant General (Audit)",
        "received_date": "2026-02-12",
        "page_count": 3,
        "classification": "digital",
        "language": "eng",
        "processing_status": "Ready for Review",
        "created_by": "intake_officer",
        "created_at": "2026-02-12T10:00:00Z",
        "updated_at": "2026-02-12T10:05:00Z",
    }
    await db.documents.update_one({"_id": doc_1["_id"]}, {"$set": doc_1}, upsert=True)

    # Document Pages for Doc 1
    doc_1_pages = [
        {
            "_id": "DOC-2026-ENG-001_p1",
            "document_id": doc_1["_id"],
            "page_number": 1,
            "original_text": "Audit Review: Payment of Rs. 4,50,00,000 released to M/s Apex Infra Enterprises on 15th October 2023 without verified title clearance from the District Collectorate.",
            "ocr_text": "",
            "normalized_text": "Audit Review: Payment of Rs. 4,50,00,000 released to M/s Apex Infra Enterprises on 15th October 2023 without verified title clearance from the District Collectorate.",
            "translated_text": "Audit Review: Payment of Rs. 4,50,00,000 released to M/s Apex Infra Enterprises on 15th October 2023 without verified title clearance from the District Collectorate.",
            "detected_language": "eng",
            "extraction_method": "digital_pymupdf",
            "ocr_confidence": 100.0,
            "layout_metadata": {"blocks_count": 4},
        },
        {
            "_id": "DOC-2026-ENG-001_p2",
            "document_id": doc_1["_id"],
            "page_number": 2,
            "original_text": "Letter Ref No. REV/2023/8892 confirms that Deputy Collector Shri Hiren Joshi issued conditional clearance on 12th October 2023, subject to environmental review.",
            "ocr_text": "",
            "normalized_text": "Letter Ref No. REV/2023/8892 confirms that Deputy Collector Shri Hiren Joshi issued conditional clearance on 12th October 2023, subject to environmental review.",
            "translated_text": "Letter Ref No. REV/2023/8892 confirms that Deputy Collector Shri Hiren Joshi issued conditional clearance on 12th October 2023, subject to environmental review.",
            "detected_language": "eng",
            "extraction_method": "digital_pymupdf",
            "ocr_confidence": 100.0,
            "layout_metadata": {"blocks_count": 3},
        }
    ]
    for p in doc_1_pages:
        await db.document_pages.update_one({"_id": p["_id"]}, {"$set": p}, upsert=True)

    # Document 2: Gujarati Revenue Extract
    doc_2 = {
        "_id": "DOC-2026-GUJ-002",
        "document_id": "DOC-2026-GUJ-002",
        "case_id": case_id,
        "document_title": "મહેસૂલ ખાતાનો હુકમ - જમીન સંપાદન નોંધણી (Sanand Parcel 412/A)",
        "original_filename": "Revenue_Order_Sanand_Gujarati.pdf",
        "storage_key": "DOC-2026-GUJ-002_Revenue_Order_Sanand_Gujarati.pdf",
        "mime_type": "application/pdf",
        "file_size": 210400,
        "sha256": "8f89e23c723f590a21345d8b7a6e19c0b898234125b678cd89e1a2f3456789ab",
        "document_category": "Revenue Order",
        "source_authority": "તાલુકા મામલતદાર કચેરી, સાણંદ",
        "received_date": "2026-02-14",
        "page_count": 2,
        "classification": "digital",
        "language": "guj",
        "processing_status": "Ready for Review",
        "created_by": "intake_officer",
        "created_at": "2026-02-14T11:20:00Z",
        "updated_at": "2026-02-14T11:25:00Z",
    }
    await db.documents.update_one({"_id": doc_2["_id"]}, {"$set": doc_2}, upsert=True)

    doc_2_pages = [
        {
            "_id": "DOC-2026-GUJ-002_p1",
            "document_id": doc_2["_id"],
            "page_number": 1,
            "original_text": "તારીખ ૧૮ ઓક્ટોબર ૨૦૨૩ ના રોજ શ્રી હિરેન જોશી દ્વારા જમીન સંપાદન પેટે રૂ. ૨,૫૦,૦૦,૦૦૦ ચુકવણી મંજૂર કરવામાં આવી હતી.",
            "ocr_text": "",
            "normalized_text": "તારીખ ૧૮ ઓક્ટોબર ૨૦૨૩ ના રોજ શ્રી હિરેન જોશી દ્વારા જમીન સંપાદન પેટે રૂ. ૨,૫૦,૦૦,૦૦૦ ચુકવણી મંજૂર કરવામાં આવી હતી.",
            "translated_text": "On 18th October 2023, payment of Rs. 2,50,00,000 for land acquisition was sanctioned by Shri Hiren Joshi.",
            "detected_language": "guj",
            "extraction_method": "digital_pymupdf",
            "ocr_confidence": 98.0,
            "layout_metadata": {"blocks_count": 2},
        }
    ]
    for p in doc_2_pages:
        await db.document_pages.update_one({"_id": p["_id"]}, {"$set": p}, upsert=True)

    # 4. Seed Evidence Records
    ev_1 = {
        "_id": "EV-SANAND-001",
        "evidence_id": "EV-SANAND-001",
        "case_id": case_id,
        "document_id": doc_1["_id"],
        "page_number": 1,
        "paragraph_reference": 1,
        "source_excerpt": "Payment of Rs. 4,50,00,000 released to M/s Apex Infra Enterprises on 15th October 2023 without verified title clearance.",
        "normalized_text": "Audit Review: Payment of Rs. 4,50,00,000 released to M/s Apex Infra Enterprises on 15th October 2023 without verified title clearance from the District Collectorate.",
        "translated_text": "",
        "evidence_category": "Financial Transaction",
        "associated_entities": ["Apex Infra Enterprises", "District Collectorate", "Rs. 4,50,00,000", "15th October 2023"],
        "chunk_ids": [],
        "confidence": 0.94,
        "verification_status": "verified",
        "verification_notes": [{"verified_by": "investigator", "status": "verified", "notes": "Corroborated with bank statement voucher", "timestamp": "2026-02-15T10:00:00Z"}],
        "created_at": "2026-02-15T09:00:00Z",
        "updated_at": "2026-02-15T10:00:00Z",
    }
    ev_2 = {
        "_id": "EV-SANAND-002",
        "evidence_id": "EV-SANAND-002",
        "case_id": case_id,
        "document_id": doc_2["_id"],
        "page_number": 1,
        "paragraph_reference": 1,
        "source_excerpt": "તારીખ ૧૮ ઓક્ટોબર ૨૦૨૩ ના રોજ શ્રી હિરેન જોશી દ્વારા જમીન સંપાદન પેટે રૂ. ૨,૫૦,૦૦,૦૦૦ ચુકવણી મંજૂર કરવામાં આવી હતી.",
        "normalized_text": "તારીખ ૧૮ ઓક્ટોબર ૨૦૨૩ ના રોજ શ્રી હિરેન જોશી દ્વારા જમીન સંપાદન પેટે રૂ. ૨,૫૦,૦૦,૦૦૦ ચુકવણી મંજૂર કરવામાં આવી હતી.",
        "translated_text": "On 18th October 2023, payment of Rs. 2,50,00,000 for land acquisition was sanctioned by Shri Hiren Joshi.",
        "evidence_category": "Financial Transaction",
        "associated_entities": ["Shri Hiren Joshi", "Rs. 2,50,00,000", "18th October 2023"],
        "chunk_ids": [],
        "confidence": 0.91,
        "verification_status": "unverified",
        "verification_notes": [],
        "created_at": "2026-02-15T09:05:00Z",
        "updated_at": "2026-02-15T09:05:00Z",
    }
    await db.evidence_records.update_one({"_id": ev_1["_id"]}, {"$set": ev_1}, upsert=True)
    await db.evidence_records.update_one({"_id": ev_2["_id"]}, {"$set": ev_2}, upsert=True)
    print("Seeded structured Evidence Records in MongoDB Evidence Ledger.")

    # 5. Seed Entities
    entities = [
        {
            "_id": f"{case_id}_apex infra enterprises_Organization",
            "case_id": case_id,
            "entity_name": "Apex Infra Enterprises",
            "normalized_name": "apex infra enterprises",
            "entity_type": "Organization",
            "source_occurrences": [{"document_id": doc_1["_id"], "page_number": 1}],
            "created_at": "2026-02-15T09:00:00Z",
        },
        {
            "_id": f"{case_id}_hiren joshi_Person",
            "case_id": case_id,
            "entity_name": "Shri Hiren Joshi",
            "normalized_name": "hiren joshi",
            "entity_type": "Person",
            "source_occurrences": [
                {"document_id": doc_1["_id"], "page_number": 2},
                {"document_id": doc_2["_id"], "page_number": 1}
            ],
            "created_at": "2026-02-15T09:00:00Z",
        },
        {
            "_id": f"{case_id}_district collectorate_Government Department",
            "case_id": case_id,
            "entity_name": "District Collectorate",
            "normalized_name": "district collectorate",
            "entity_type": "Government Department",
            "source_occurrences": [{"document_id": doc_1["_id"], "page_number": 1}],
            "created_at": "2026-02-15T09:00:00Z",
        }
    ]
    for ent in entities:
        await db.entities.update_one({"_id": ent["_id"]}, {"$set": ent}, upsert=True)

    # 6. Seed Chronology Events
    events = [
        {
            "_id": "EVT-2023-1012",
            "event_id": "EVT-2023-1012",
            "case_id": case_id,
            "document_id": doc_1["_id"],
            "event_title": "Issuance of Conditional Clearance Order",
            "description": "Deputy Collector Shri Hiren Joshi issued conditional clearance order REV/2023/8892.",
            "event_date": "2023-10-12",
            "original_date_expression": "12th October 2023",
            "date_precision": "exact",
            "associated_entities": ["Shri Hiren Joshi", "REV/2023/8892"],
            "evidence_ids": [ev_1["_id"]],
            "source_page": 2,
            "confidence": 0.95,
            "review_status": "verified",
            "created_at": "2026-02-15T09:00:00Z",
        },
        {
            "_id": "EVT-2023-1015",
            "event_id": "EVT-2023-1015",
            "case_id": case_id,
            "document_id": doc_1["_id"],
            "event_title": "First Tranche Disbursement to Apex Infra",
            "description": "Payment of Rs. 4,50,00,000 released to M/s Apex Infra Enterprises.",
            "event_date": "2023-10-15",
            "original_date_expression": "15th October 2023",
            "date_precision": "exact",
            "associated_entities": ["Apex Infra Enterprises", "Rs. 4,50,00,000"],
            "evidence_ids": [ev_1["_id"]],
            "source_page": 1,
            "confidence": 0.94,
            "review_status": "verified",
            "created_at": "2026-02-15T09:00:00Z",
        },
        {
            "_id": "EVT-2023-1018",
            "event_id": "EVT-2023-1018",
            "case_id": case_id,
            "document_id": doc_2["_id"],
            "event_title": "Mamlatdar Sanction Order for Land Acquisition",
            "description": "Payment of Rs. 2,50,00,000 for land acquisition sanctioned by Shri Hiren Joshi in Taluka record.",
            "event_date": "2023-10-18",
            "original_date_expression": "૧૮ ઓક્ટોબર ૨૦૨૩",
            "date_precision": "exact",
            "associated_entities": ["Shri Hiren Joshi", "Rs. 2,50,00,000"],
            "evidence_ids": [ev_2["_id"]],
            "source_page": 1,
            "confidence": 0.91,
            "review_status": "pending_review",
            "created_at": "2026-02-15T09:05:00Z",
        }
    ]
    for ev in events:
        await db.events.update_one({"_id": ev["_id"]}, {"$set": ev}, upsert=True)
    print(f"Seeded {len(events)} chronological event records.")

    # 7. Seed Contradiction Record
    contra_id = "CONTRA-SANAND-001"
    contra_doc = {
        "_id": contra_id,
        "contradiction_id": contra_id,
        "case_id": case_id,
        "category": "Conflicting Amounts & Dates",
        "evidence_id_a": ev_1["_id"],
        "evidence_id_b": ev_2["_id"],
        "related_entities": ["Shri Hiren Joshi", "Apex Infra Enterprises"],
        "explanation": "Document 1 records Rs. 4,50,00,000 released on 15 Oct 2023, while Document 2 records sanction of Rs. 2,50,00,000 on 18 Oct 2023 for the same parcel acquisition. A discrepancy of Rs. 2,00,00,000 exists between the state audit register and the taluka mamlatdar order.",
        "confidence": 0.89,
        "status": "Needs Further Review",
        "officer_explanation": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": "2026-02-15T09:10:00Z",
    }
    await db.contradictions.update_one({"_id": contra_id}, {"$set": contra_doc}, upsert=True)
    print("Seeded Potential Contradiction: CONTRA-SANAND-001")

    # 8. Seed Sample Processing Job
    job_id = "JOB-SANAND-INIT-001"
    job_doc = {
        "_id": job_id,
        "job_id": job_id,
        "document_id": doc_1["_id"],
        "case_id": case_id,
        "job_type": "full_pipeline_ingestion",
        "current_stage": "Completed",
        "status": "Completed",
        "progress": 100,
        "retry_count": 0,
        "error": None,
        "started_at": "2026-02-12T10:00:00Z",
        "completed_at": "2026-02-12T10:01:24Z",
        "worker_id": "celery_pipeline_worker_01",
    }
    await db.processing_jobs.update_one({"_id": job_id}, {"$set": job_doc}, upsert=True)

    # 9. Initial Audit Log
    await AuditService.log_event(
        user_id="SYSTEM_BOOTSTRAP",
        action="DATABASE_SEEDED",
        resource_type="system",
        resource_id=case_id,
        outcome="SUCCESS",
        metadata={"seed_version": "1.0.0", "target_case": case_id}
    )

    # 10. Ingest Synthetic Demo Case (NVD-DR-2026-014)
    try:
        from app.db.register_dummy_case import register_dummy_case
        await register_dummy_case(close_conn=False)
    except Exception as e:
        print(f"Demo case auto-registration note: {e}")

    print("--- Database Seeding Completed Successfully ---")
    await close_mongodb_connection()


if __name__ == "__main__":
    asyncio.run(seed_data())
