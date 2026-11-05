# Government Document Evidence Intelligence & Briefing Management System
## MongoDB Database & Collection Specification

Database Name: `evidence_intelligence_gov`

---

### Table of Contents
1. [Overview & Data Architecture](#1-overview--data-architecture)
2. [Collection Catalog](#2-collection-catalog)
3. [Detailed Collection Schemas](#3-detailed-collection-schemas)
   - 3.1 [`users`](#31-users)
   - 3.2 [`cases`](#32-cases)
   - 3.3 [`documents`](#33-documents)
   - 3.4 [`pages`](#34-pages)
   - 3.5 [`extracted_features`](#35-extracted_features)
   - 3.6 [`processing_jobs`](#36-processing_jobs)
   - 3.7 [`evidence_ledger`](#37-evidence_ledger)
   - 3.8 [`entities`](#38-entities)
   - 3.9 [`chronology_events`](#39-chronology_events)
   - 3.10 [`contradictions`](#310-contradictions)
   - 3.11 [`briefings`](#311-briefings)
   - 3.12 [`claim_verifications`](#312-claim_verifications)
   - 3.13 [`audit_ledger`](#313-audit_ledger)
   - 3.14 [`ai_model_configs`](#314-ai_model_configs)
   - 3.15 [`system_metrics`](#315-system_metrics)
4. [Index Catalog](#4-index-catalog)
5. [Integrity & Retention Rules](#5-integrity--retention-rules)

---

### 1. Overview & Data Architecture

The persistence tier relies on MongoDB as the primary operational data store and evidence registry.
Key architectural principles:
- **No Large Binary Blobs in MongoDB**: PDF binaries and large raster assets are never stored in MongoDB documents; they are persisted in S3-compatible Object Storage (MinIO/AWS S3) and referenced by content-addressable storage keys and SHA-256 hashes.
- **Strict Grounding & Traceability**: All evidence records, entities, chronology events, and briefing claims store explicit parent references (`case_id`, `document_id`, `page_number`, `bounding_boxes`, `source_text`).
- **Cryptographic Chaining**: The `audit_ledger` implements an append-only cryptographic hash chain where each entry includes the SHA-256 hash of its predecessor.

---

### 2. Collection Catalog

| # | Collection Name | Purpose | Primary Key Index |
|---|-----------------|---------|-------------------|
| 1 | `users` | Officer accounts, hashed passwords, roles, department | `_id`, `username` (unique) |
| 2 | `cases` | Official case workspaces, security classification, status | `_id`, `case_number` (unique) |
| 3 | `documents` | Ingested PDF metadata, SHA-256 hashes, status | `_id`, `sha256_checksum` |
| 4 | `pages` | Page-level extracted digital text, OCR confidence, layout | `_id`, `(document_id, page_number)` |
| 5 | `extracted_features`| Layout blocks, tables, fonts, header/footer zones | `_id`, `document_id` |
| 6 | `processing_jobs` | Background Celery extraction job progress & logs | `_id`, `job_id` (unique) |
| 7 | `evidence_ledger` | Central atomic evidence items extracted from docs | `_id`, `case_id`, `document_id` |
| 8 | `entities` | Named entities across 12 classifications & mentions | `_id`, `(case_id, canonical_name)` |
| 9 | `chronology_events`| Normalized chronological timeline entries | `_id`, `case_id`, `event_date` |
| 10 | `contradictions` | Detected discrepancies, pairwise contradictions | `_id`, `case_id`, `status` |
| 11 | `briefings` | 16-section synthesized briefing documents & reviews | `_id`, `case_id`, `status` |
| 12 | `claim_verifications` | Atomic claims with ground-truth citations & checks | `_id`, `briefing_id`, `claim_id` |
| 13 | `audit_ledger` | Immutable SHA-256 chained audit trail of all operations | `_id`, `sequence_number`, `record_hash` |
| 14 | `ai_model_configs` | Configuration states and health metrics of AI models | `_id`, `service_name` |
| 15 | `system_metrics` | System resource telemetry, worker queue depths | `_id`, `timestamp` |

---

### 3. Detailed Collection Schemas

#### 3.1 `users`
```json
{
  "_id": "ObjectId",
  "username": "investigator",
  "hashed_password": "$2b$12$...",
  "full_name": "Senior Inspector S. K. Patel",
  "email": "investigator@gov.in",
  "designation": "Lead Investigation Officer",
  "department": "State Economic Offences Wing",
  "role": "investigator", // admin, investigator, reviewer, intake_officer, auditor
  "classification_clearance": "Top Secret",
  "status": "active", // active, suspended, deactivated
  "last_login": "ISODate('2026-03-05T09:15:00Z')",
  "created_at": "ISODate('2026-03-01T00:00:00Z')"
}
```

#### 3.2 `cases`
```json
{
  "_id": "ObjectId",
  "case_number": "CR-2026-GUJ-042",
  "title": "Operation Clean Ledger — Public Procurement Probe",
  "description": "Multi-departmental inquiry into procurement deviations...",
  "classification_level": "Secret", // Official, Confidential, Secret, Top Secret
  "status": "active", // active, under_review, closed, archived
  "lead_officer_id": "investigator",
  "assigned_officers": ["investigator", "reviewer"],
  "document_count": 5,
  "evidence_count": 18,
  "briefing_count": 2,
  "created_at": "ISODate('2026-03-01T10:00:00Z')",
  "updated_at": "ISODate('2026-03-05T12:00:00Z')"
}
```

#### 3.3 `documents`
```json
{
  "_id": "ObjectId",
  "case_id": "CR-2026-GUJ-042",
  "title": "GMB Master Concession Agreement 2021",
  "file_name": "GMB_Agreement_2021.pdf",
  "storage_key": "cases/CR-2026-GUJ-042/documents/e3b0c442.pdf",
  "file_size": 1420850,
  "sha256_checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "mime_type": "application/pdf",
  "category": "official_record",
  "source_authority": "Gujarat Maritime Board",
  "reference_number": "GMB/PORT/2021/881",
  "received_date": "2021-04-15",
  "remarks": "Submitted pursuant to notice under CrPC Sec 91.",
  "status": "ready_for_review", // uploaded, validating, classified, pending_extraction, processing, extracted, under_ai_analysis, indexed, ready_for_review, failed, cancelled
  "is_scanned": false,
  "has_digital_text": true,
  "ocr_confidence_avg": 0.98,
  "ocr_warnings": [],
  "detected_languages": ["en", "gu"],
  "page_count": 14,
  "created_by": "intake_officer",
  "created_at": "ISODate('2026-03-02T10:00:00Z')"
}
```

#### 3.4 `pages`
```json
{
  "_id": "ObjectId",
  "document_id": "67ca32fa1234567890doc01",
  "case_id": "CR-2026-GUJ-042",
  "page_number": 1,
  "raw_text": "GOVERNMENT OF GUJARAT...",
  "translated_text": "GOVERNMENT OF GUJARAT...",
  "detected_language": "en",
  "extraction_method": "digital_pdf", // digital_pdf, scanned_ocr, hybrid
  "ocr_confidence": 0.99,
  "is_low_quality": false,
  "char_count": 2150,
  "blocks": [
    {
      "block_id": 0,
      "text": "GOVERNMENT OF GUJARAT",
      "bbox": [50.4, 72.0, 540.2, 95.1],
      "block_type": "heading"
    }
  ],
  "created_at": "ISODate('2026-03-02T10:02:00Z')"
}
```

#### 3.5 `processing_jobs`
```json
{
  "_id": "ObjectId",
  "job_id": "job_e3b0c442",
  "case_id": "CR-2026-GUJ-042",
  "document_id": "67ca32fa1234567890doc01",
  "current_stage": "completed",
  "status": "completed", // pending, processing, completed, failed, cancelled
  "progress_pct": 100,
  "stages_completed": [
    "file_validation",
    "pdf_parsing",
    "feature_normalization",
    "language_detection",
    "translation",
    "nlp_preprocessing",
    "named_entity_recognition",
    "structured_extraction",
    "dense_vector_indexing"
  ],
  "error_message": null,
  "retry_count": 0,
  "started_at": "ISODate('2026-03-02T10:00:05Z')",
  "completed_at": "ISODate('2026-03-02T10:01:25Z')",
  "duration_seconds": 80.2
}
```

#### 3.6 `evidence_ledger`
```json
{
  "_id": "ObjectId",
  "case_id": "CR-2026-GUJ-042",
  "document_id": "67ca32fa1234567890doc01",
  "document_title": "GMB Concession Agreement 2021",
  "page_number": 4,
  "evidence_type": "financial_figure", // factual_assertion, financial_figure, timeline_anchor, legal_reference, admission, corroboration
  "raw_text": "વધારેલ વહીવટી ખર્ચ રૂ. ૪૨,૫૦,૦૦૦ મંજૂર કરવામાં આવ્યો.",
  "translated_text": "Enhanced administrative expenditure of Rs. 42,50,000 was approved.",
  "source_language": "gu",
  "bounding_box": [100.0, 240.5, 480.0, 260.0],
  "entities_mentioned": ["GMB", "Rs. 42,50,000"],
  "extraction_confidence": 0.96,
  "is_verified": true,
  "verified_by": "investigator",
  "verification_notes": "Corroborated with treasury ledger voucher #781.",
  "created_at": "ISODate('2026-03-02T10:01:10Z')"
}
```

#### 3.7 `entities`
```json
{
  "_id": "ObjectId",
  "case_id": "CR-2026-GUJ-042",
  "canonical_name": "Apex Logistics Private Limited",
  "category": "Company / Agency / Vendor",
  "aliases": ["Apex Logistics", "Apex Pvt Ltd", "એપેક્સ લોજિસ્ટિક્સ"],
  "mention_count": 14,
  "documents_present": ["67ca32fa1234567890doc01", "67ca32fa1234567890doc02"],
  "metadata": {
    "cin": "U60200GJ2015PTC084123",
    "pan": "AAACA1234F"
  },
  "created_at": "ISODate('2026-03-02T10:01:15Z')"
}
```

#### 3.8 `chronology_events`
```json
{
  "_id": "ObjectId",
  "case_id": "CR-2026-GUJ-042",
  "event_date": "ISODate('2021-04-12T00:00:00Z')",
  "event_date_raw": "12th April 2021",
  "title": "Concession Agreement Signed",
  "description": "Port concession agreement executed between GMB and Apex Logistics Ltd.",
  "supporting_evidence_ids": ["67ca32fa1234567890ev001"],
  "significance": "critical", // critical, high, medium, low
  "source_document_title": "GMB Concession Agreement 2021",
  "source_page": 1,
  "is_verified": true,
  "created_at": "ISODate('2026-03-02T10:01:20Z')"
}
```

#### 3.9 `contradictions`
```json
{
  "_id": "ObjectId",
  "case_id": "CR-2026-GUJ-042",
  "topic": "Date of Initial Site Inspection",
  "source_a": {
    "document_id": "67ca32fa1234567890doc01",
    "document_title": "Inspection Report",
    "page": 2,
    "quote": "The site was initially surveyed on 14th May 2021 by the technical committee."
  },
  "source_b": {
    "document_id": "67ca32fa1234567890doc02",
    "document_title": "Contractor Logbook",
    "page": 7,
    "quote": "No official inspection took place prior to 28th June 2021."
  },
  "discrepancy_explanation": "Direct conflict regarding the date and occurrence of statutory site survey.",
  "status": "unresolved", // unresolved, corroborated, dismissed, referred_for_further_probe
  "officer_notes": null,
  "determination": null,
  "detected_at": "ISODate('2026-03-02T10:01:22Z')"
}
```

#### 3.10 `briefings`
```json
{
  "_id": "ObjectId",
  "case_id": "CR-2026-GUJ-042",
  "title": "Comprehensive Briefing — Public Procurement Irregularity",
  "classification_level": "Secret",
  "template_type": "standard_investigation",
  "status": "approved", // draft, under_review, changes_requested, approved, archived
  "author_officer_id": "investigator",
  "reviewer_officer_id": "reviewer",
  "sections": {
    "executive_summary": "This briefing synthesizes evidentiary findings...",
    "case_background": "Investigation initiated following audit note...",
    "jurisdiction_and_authority": "Exercised pursuant to Section 17A of PC Act...",
    "chronological_summary": "The chronological sequence establishes...",
    "key_entities_involved": "Primary entities include...",
    "core_evidentiary_findings": "The documentary evidence confirms...",
    "financial_analysis": "Discrepancy identified totaling Rs. 42,50,000...",
    "contradictions_and_discrepancies": "Contradiction #1 remains unresolved...",
    "legal_provisions_invoked": "Sections 409, 420, 120B IPC...",
    "gaps_in_evidence": "Original sub-contractor invoices pending response...",
    "investigative_actions_taken": "Search and seizure executed on...",
    "risk_assessment": "Moderate flight and document tampering risk...",
    "recommended_actions": "Proceed with filing formal charge-sheet...",
    "annexures_and_references": "Annexures A-1 through A-14 attached.",
    "officer_certification": "Certified accurate based on authenticated records.",
    "supervisory_endorsement": "Reviewed and endorsed for competent authority."
  },
  "created_at": "ISODate('2026-03-03T11:00:00Z')",
  "approved_at": "ISODate('2026-03-04T15:30:00Z')"
}
```

#### 3.11 `claim_verifications`
```json
{
  "_id": "ObjectId",
  "briefing_id": "67ca32fa1234567890br01",
  "claim_id": "claim_001",
  "section": "financial_analysis",
  "statement": "An enhanced administrative amount of Rs. 42,50,000 was disbursed without board sanction.",
  "citations": [
    {
      "document_id": "67ca32fa1234567890doc01",
      "page": 4,
      "exact_quote": "Enhanced administrative expenditure of Rs. 42,50,000 was approved."
    }
  ],
  "verification_status": "verified", // verified, partially_supported, unsupported, contradicted
  "officer_notes": "Cross-checked with Treasury Voucher #781.",
  "verified_by": "reviewer",
  "updated_at": "ISODate('2026-03-04T14:00:00Z')"
}
```

#### 3.12 `audit_ledger`
```json
{
  "_id": "ObjectId",
  "sequence_number": 42,
  "timestamp": "ISODate('2026-03-04T15:30:00Z')",
  "officer_id": "reviewer",
  "officer_role": "reviewer",
  "action": "briefing:approve",
  "resource_type": "briefing",
  "resource_id": "67ca32fa1234567890br01",
  "ip_address": "10.14.22.8",
  "payload": {
    "action_detail": "Approved formal briefing after claim verification",
    "classification": "Secret"
  },
  "previous_hash": "b47c92b0c39f...",
  "record_hash": "f29108a73b18..."
}
```

---

### 4. Index Catalog

The following compound, text, and unique indexes are provisioned by `backend/app/db/indexes.py`:

```python
# users
{"username": 1}, unique=True
{"email": 1}, unique=True

# cases
{"case_number": 1}, unique=True
{"status": 1, "created_at": -1}

# documents
{"case_id": 1, "created_at": -1}
{"sha256_checksum": 1}
{"status": 1}

# pages
{"document_id": 1, "page_number": 1}, unique=True

# evidence_ledger
{"case_id": 1, "evidence_type": 1}
{"document_id": 1}
{"$**": "text"} # Full-text search across raw and translated text

# entities
{"case_id": 1, "canonical_name": 1}
{"category": 1}

# chronology_events
{"case_id": 1, "event_date": 1}

# contradictions
{"case_id": 1, "status": 1}

# briefings
{"case_id": 1, "created_at": -1}

# claim_verifications
{"briefing_id": 1, "claim_id": 1}, unique=True

# audit_ledger
{"sequence_number": 1}, unique=True
{"record_hash": 1}, unique=True
{"case_id": 1, "timestamp": -1}
```

---

### 5. Integrity & Retention Rules

1. **Tamper Detection**: Any modification to historical audit records invalidates the cryptographic hash chain. The integrity endpoint iterates all records, computing `SHA256(previous_hash + payload)` and matching against `record_hash`.
2. **Foreign Key Soft Consistency**: When a document is soft-deleted or marked cancelled, child records in `pages`, `evidence_ledger`, and `entities` are flagged with `is_archived: true` rather than hard deleted to preserve legal admissibility.
3. **No PDF Blob Storage**: Monitored via maximum BSON document size (16MB). Documents exceeding 1MB trigger an architecture audit alert.
