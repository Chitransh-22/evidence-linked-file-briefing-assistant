# Government Document Evidence Intelligence & Briefing Management System
## REST API Reference Specification (v1)

Base URL: `/api/v1`  
Authentication: HTTP Bearer Token (`Authorization: Bearer <access_token>`)

---

### Table of Contents
1. [Authentication (`/auth`)](#1-authentication)
2. [Cases & Workspaces (`/cases`)](#2-cases--workspaces)
3. [Document Intake & Management (`/documents`)](#3-document-intake--management)
4. [Processing Jobs & Queue (`/jobs`)](#4-processing-jobs--queue)
5. [Evidence Ledger (`/evidence`)](#5-evidence-ledger)
6. [Entity Register (`/entities`)](#6-entity-register)
7. [Chronology & Events (`/chronology`)](#7-chronology--events)
8. [Contradiction Analysis (`/contradictions`)](#8-contradiction-analysis)
9. [Briefings & Claim Verification (`/briefings`)](#9-briefings--claim-verification)
10. [Audit Ledger (`/audit`)](#10-audit-ledger)
11. [System & AI Administration (`/admin`)](#11-system--ai-administration)

---

### 1. Authentication

#### `POST /auth/login`
Authenticates an officer and returns a signed JWT access token along with role and permissions.

- **Request Body** (`application/json`):
  ```json
  {
    "username": "investigator",
    "password": "OfficerGov2026!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "expires_in": 28800,
    "user": {
      "id": "67ca32fa1234567890abcdef",
      "username": "investigator",
      "email": "investigator@gov.in",
      "full_name": "Senior Inspector S. K. Patel",
      "designation": "Lead Investigation Officer",
      "department": "State Economic Offences Wing",
      "role": "investigator",
      "status": "active"
    }
  }
  ```

#### `GET /auth/me`
Returns the currently authenticated officer's profile, role, and active permissions.

- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
  ```json
  {
    "id": "67ca32fa1234567890abcdef",
    "username": "investigator",
    "role": "investigator",
    "permissions": ["cases:read", "cases:write", "documents:upload", "evidence:read", "briefings:create", ...]
  }
  ```

---

### 2. Cases & Workspaces

#### `GET /cases`
Retrieves a paginated list of investigation case workspaces accessible to the officer.

- **Query Parameters**:
  - `page` (int, default: 1)
  - `page_size` (int, default: 20)
  - `status` (string, optional: `active`, `under_review`, `closed`, `archived`)
  - `classification` (string, optional: `Official`, `Confidential`, `Secret`, `Top Secret`)
  - `search` (string, optional: title or case number filter)
- **Response** (`200 OK`):
  ```json
  {
    "items": [
      {
        "id": "67ca32fa1234567890abc001",
        "case_number": "CR-2026-GUJ-042",
        "title": "Operation Clean Ledger — Public Procurement Irregularity Investigation",
        "description": "Multi-departmental probe into procurement deviations...",
        "classification_level": "Secret",
        "status": "active",
        "lead_officer_id": "investigator",
        "assigned_officers": ["investigator", "reviewer"],
        "document_count": 5,
        "evidence_count": 18,
        "briefing_count": 2,
        "created_at": "2026-03-01T10:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  }
  ```

#### `POST /cases`
Creates a new case workspace.
- **Permissions**: `cases:write`
- **Request Body**:
  ```json
  {
    "case_number": "CR-2026-HQ-099",
    "title": "Border Transit Irregularities Inquiry",
    "description": "Cross-border transit clearance verification.",
    "classification_level": "Confidential",
    "lead_officer_id": "investigator",
    "assigned_officers": ["investigator"]
  }
  ```

#### `GET /cases/{case_id}`
Returns detailed metadata, metrics, and associated document tallies for a single case.

---

### 3. Document Intake & Management

#### `POST /documents/upload`
Uploads a single or multiple PDF documents with complete metadata for asynchronous ingestion.

- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: PDF binary file (validated for PDF header `%PDF-`, size limit 100MB).
  - `case_id`: Target case workspace identifier.
  - `title`: Institutional document title.
  - `category`: Category classification (`official_record`, `financial_record`, `court_pleading`, `correspondence`, `technical_report`, `affidavit`, `other`).
  - `source_authority`: Department or entity issuing the document.
  - `reference_number`: Official file reference number.
  - `received_date`: ISO date string (`YYYY-MM-DD`).
  - `remarks`: Optional officer intake notes.
- **Response** (`201 Created` or `200 OK` for duplicate detection):
  ```json
  {
    "document_id": "67ca32fa1234567890doc01",
    "job_id": "67ca32fa1234567890job01",
    "title": "GMB Master Concession Agreement 2021",
    "file_name": "GMB_Agreement_2021.pdf",
    "file_size": 1420850,
    "sha256_checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "status": "validating",
    "is_duplicate": false,
    "message": "Document uploaded successfully and queued for extraction."
  }
  ```
- **Duplicate Handling**: If the calculated SHA-256 matches an existing document, the API returns HTTP 200 with `is_duplicate: true`, referencing the previous document ID while associating the upload record with the active case.

#### `GET /documents`
Lists documents across cases or filtered by case ID, status, language, or search query.

#### `GET /documents/{document_id}`
Fetches document detail including extraction state (`uploaded`, `validating`, `classified`, `pending_extraction`, `processing`, `extracted`, `under_ai_analysis`, `indexed`, `ready_for_review`, `failed`), detected languages, OCR warnings, and page count.

#### `GET /documents/{document_id}/pages`
Retrieves paginated extracted pages with layout blocks, original text, and translated text.

#### `GET /documents/{document_id}/download`
Securely streams the unmodified original PDF from object storage.

---

### 4. Processing Jobs & Queue

#### `GET /jobs`
Returns active and completed asynchronous background extraction jobs.
- **Query Parameters**: `status`, `case_id`, `page`, `page_size`.

#### `GET /jobs/{job_id}`
Retrieves real-time processing status, progress percentage (0–100%), current sub-pipeline step (e.g. `indictrans2_translation`, `government_ner`, `dense_embeddings`), and error details if failed.

#### `GET /jobs/{job_id}/stream`
**Server-Sent Events (SSE)** endpoint. Streams live JSON progress updates to the frontend without polling.
- **Event Stream Output**:
  ```text
  data: {"job_id": "...", "stage": "layout_reconstruction", "progress": 35, "status": "processing"}
  ```

---

### 5. Evidence Ledger

#### `GET /evidence`
Queries verified and extracted evidence records from the centralized MongoDB Evidence Ledger.
- **Query Parameters**:
  - `case_id` (string, required)
  - `document_id` (string, optional)
  - `evidence_type` (string: `factual_assertion`, `financial_figure`, `timeline_anchor`, `legal_reference`, `admission`, `corroboration`)
  - `language` (string: `en`, `gu`, `hi`)
  - `confidence_min` (float: 0.0 to 1.0)
  - `verified_only` (boolean, default: false)
  - `search` (text query)
- **Response** (`200 OK`):
  ```json
  {
    "items": [
      {
        "id": "67ca32fa1234567890ev001",
        "case_id": "67ca32fa1234567890abc001",
        "document_id": "67ca32fa1234567890doc01",
        "document_title": "GMB Concession Agreement 2021",
        "page_number": 4,
        "evidence_type": "financial_figure",
        "raw_text": "વધારેલ વહીવટી ખર્ચ રૂ. ૪૨,૫૦,૦૦૦ મંજૂર કરવામાં આવ્યો.",
        "translated_text": "Enhanced administrative expenditure of Rs. 42,50,000 was approved.",
        "source_language": "gu",
        "entities_mentioned": ["GMB", "Rs. 42,50,000"],
        "confidence_score": 0.96,
        "is_verified": true,
        "verified_by": "investigator",
        "verification_notes": "Corroborated with Treasury sanction voucher #781."
      }
    ],
    "total": 18
  }
  ```

#### `POST /evidence/search`
Performs **Hybrid Semantic Evidence Retrieval** combining dense vector similarity (Qdrant) and lexical keyword matching across evidence records.
- **Request Body**:
  ```json
  {
    "query": "unauthorized cash disbursements or bank transfers",
    "case_id": "67ca32fa1234567890abc001",
    "top_k": 10,
    "score_threshold": 0.65
  }
  ```

---

### 6. Entity Register

#### `GET /entities`
Returns identified entities across the 12 government-specific classifications.
- **Query Parameters**:
  - `case_id` (string, required)
  - `category`: `Individual`, `Government Department / Ministry`, `Official Designation`, `Location / Jurisdiction`, `Date / Time`, `Monetary Amount`, `Act / Law / Section`, `Case / FIR / Reference Number`, `Company / Agency / Vendor`, `Vehicle Registration Number`, `Asset / Property Identifier`, `Communication Identifier`.

#### `GET /entities/{entity_id}/network`
Returns connected entities, co-occurrences in documents, and relationship linkages for visual graph rendering.

---

### 7. Chronology & Events

#### `GET /chronology`
Returns the normalized chronological timeline for an investigation case.
- **Query Parameters**: `case_id`, `start_date`, `end_date`, `significance` (`critical`, `high`, `medium`, `low`).
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": "67ca32fa1234567890chron01",
      "case_id": "67ca32fa1234567890abc001",
      "event_date": "2021-04-12T00:00:00Z",
      "event_date_raw": "12th April 2021",
      "title": "Concession Agreement Execution",
      "description": "Agreement signed between Gujarat Maritime Board and Apex Logistics Ltd.",
      "supporting_evidence_ids": ["67ca32fa1234567890ev001"],
      "significance": "critical",
      "source_document_title": "GMB Concession Agreement 2021",
      "source_page": 1
    }
  ]
  ```

---

### 8. Contradiction Analysis

#### `GET /contradictions`
Lists detected pairwise contradictions, inconsistencies, and discrepancies between document statements.
- **Query Parameters**: `case_id`, `status` (`unresolved`, `corroborated`, `dismissed`, `referred_for_further_probe`).

#### `PATCH /contradictions/{contradiction_id}`
Updates an officer's determination, resolution notes, and verified status on a detected contradiction.
- **Request Body**:
  ```json
  {
    "status": "corroborated",
    "officer_notes": "Cross-verified with bank account statement dated 15-May-2021. The invoice date was falsely backdated.",
    "determination": "Fabricated backdated document"
  }
  ```

---

### 9. Briefings & Claim Verification

#### `POST /briefings/generate`
Synthesizes a 16-section structured investigation briefing from case evidence, chronology, and contradictions.
- **Request Body**:
  ```json
  {
    "case_id": "67ca32fa1234567890abc001",
    "title": "Comprehensive Briefing — Financial Irregularities Probe",
    "template_type": "standard_investigation",
    "included_sections": [
      "executive_summary",
      "case_background",
      "jurisdiction_and_authority",
      "chronological_summary",
      "key_entities_involved",
      "core_evidentiary_findings",
      "financial_analysis",
      "contradictions_and_discrepancies",
      "legal_provisions_invoked",
      "gaps_in_evidence",
      "investigative_actions_taken",
      "risk_assessment",
      "recommended_actions",
      "annexures_and_references",
      "officer_certification",
      "supervisory_endorsement"
    ]
  }
  ```

#### `GET /briefings/{briefing_id}`
Retrieves briefing document including the 16 structured sections, verification status, reviewer comments, and approval state.

#### `GET /briefings/{briefing_id}/claims`
Retrieves all atomic claims extracted from the briefing for the **Claim Verification Workspace**.
- Each claim contains:
  - `claim_id`
  - `claim_text`
  - `section_name`
  - `grounded_source_citations` (document ID, page, text quote)
  - `verification_status` (`verified`, `partially_supported`, `unsupported`, `contradicted`)
  - `confidence_score`

#### `PATCH /briefings/{briefing_id}/claims/{claim_id}`
Updates an officer's verification status on an individual claim.

#### `PATCH /briefings/{briefing_id}/sections`
Updates narrative text for one or more sections during officer review.
- Records review audit and preserves edit history.

#### `POST /briefings/{briefing_id}/submit-for-review`
Submits a drafted briefing for formal supervisory endorsement.

#### `POST /briefings/{briefing_id}/approve`
Signs off and approves a briefing.
- **Enforcement**: Strict Separation of Duties. The approving supervisor **cannot** be the officer who drafted the briefing (`author_officer_id != reviewer_officer_id`).

#### `GET /briefings/{briefing_id}/export/pdf`
Generates and downloads an official government-formatted PDF briefing document with headers, classification markings, verification stamps, and signature blocks.

#### `GET /briefings/{briefing_id}/export/docx`
Generates and downloads an editable Microsoft Word (`.docx`) document conforming to government formatting standards.

---

### 10. Audit Ledger

#### `GET /audit`
Queries the immutable, append-only audit trail.
- **Query Parameters**: `case_id`, `officer_id`, `action`, `start_date`, `end_date`, `page`, `page_size`.

#### `POST /audit/verify-integrity`
Executes an end-to-end cryptographic integrity verification across the audit chain.
- Computes SHA-256 hashes sequentially from the genesis record to the latest entry (`hash_n = SHA256(hash_{n-1} + record_payload)`).
- Returns:
  ```json
  {
    "chain_valid": true,
    "total_records_checked": 142,
    "tampered_records": [],
    "last_block_hash": "a8f3b20c91823d...",
    "verification_timestamp": "2026-03-05T14:32:00Z"
  }
  ```

---

### 11. System & AI Administration

#### `GET /admin/users`
Lists user accounts, statuses, and role assignments.

#### `POST /admin/users`
Creates a new officer account with assigned role and clearance level.

#### `GET /admin/ai-services/health`
Inspects live connectivity and readiness status for all external AI pipeline engines:
- `indictrans2`: Checks PyTorch / HuggingFace model weight availability.
- `tesseract_ocr`: Checks Tesseract binary and Gujarati (`guj`), Hindi (`hin`), and English (`eng`) language packs.
- `ollama_llm`: Probes local LLM endpoint (`/api/tags`).
- `qdrant_vector`: Probes vector database HTTP readiness endpoint (`/healthz`).

#### `GET /admin/system/metrics`
Reports CPU, memory, disk, and object storage utilization along with job queue depths.