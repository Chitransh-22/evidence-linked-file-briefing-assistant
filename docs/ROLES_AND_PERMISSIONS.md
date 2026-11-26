# Role-Based Access Control (RBAC) & Feature Access Guide

**Government Document Evidence Intelligence & Briefing Management System**  
*Localhost Environment Reference & Security Architecture*

---

## 1. Executive Summary & Security Model

The system enforces a strict **Role-Based Access Control (RBAC)** architecture coupled with **Separation of Duties (SoD)** and **Tamper-Evident Cryptographic Auditing**. 

Access control is implemented across three tiers:
1. **Frontend Route Guards (`ProtectedRoute`):** Restricts navigation and UI views based on the authenticated user's assigned role.
2. **Backend Role Dependencies (`require_roles`):** FastAPI route-level decorators that validate JSON Web Token (JWT) claims and enforce role authorizations.
3. **Case-Level Access Partitioning (`check_case_access`):** Operational jurisdiction rules restricting officers strictly to cases they are assigned to, while granting unconditional read/audit visibility to System Administrators and Independent Vigilance Auditors.

---

## 2. Localhost Quick-Login Credentials & Seed Identities

The localhost deployment includes pre-seeded demonstration accounts for all 5 system roles:

| Role Name | System Key (`role`) | Localhost Username | Default Password | Seeded Officer Name & Designation | Primary Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Investigating Officer** | `investigating_officer` | `investigator` | `OfficerGov2026!` | Inspector Vikramaditya Mehta *(Chief Investigating Officer)* | Case management, evidence analysis & briefing draft |
| **Supervisory Reviewer** | `supervisory_reviewer` | `reviewer` | `OfficerGov2026!` | Shri Arvind Swaminathan *(Supervisory Review Commissioner)* | Claim verification, 3-column review & approval sign-off |
| **System Administrator** | `system_administrator` | `admin` | `AdminSecureGov2026!` | Dr. Rajesh Sharma *(Director of IT & Systems)* | User management, AI engine health & system telemetry |
| **Intake Officer** | `intake_officer` | `intake_officer` | `OfficerGov2026!` | Smt. Priya Patel *(Central Registry Ingestion Officer)* | Document intake dropzone, SHA-256 checks & routing |
| **Independent Auditor** | `auditor` | `auditor` | `OfficerGov2026!` | Ms. Ananya Sengupta *(Independent Vigilance Auditor)* | Read-only ledger & SHA-256 audit chain verification |

---

## 3. Master Access & Permissions Matrix

| Feature / Operation | Investigating Officer | Supervisory Reviewer | System Admin | Intake Officer | Independent Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Dashboard & Case Overview** | ✅ (Assigned) | ✅ (Assigned) | ✅ (All Cases) | ✅ (Assigned) | ✅ (All Cases) |
| **View Case Register (`GET /cases`)** | ✅ (Assigned) | ✅ (Assigned) | ✅ (All Cases) | ✅ (Assigned) | ✅ (All Cases) |
| **Create New Case (`POST /cases`)** | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Update Case Details (`PATCH /cases/{id}`)** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Assign Officers to Case (`POST /cases/{id}/assign`)** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Archive Case (`POST /cases/{id}/archive`)** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Document Intake / Upload (`POST /documents/upload`)** | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Document Library (`GET /documents`)** | ✅ (Assigned) | ✅ (Assigned) | ✅ (All Docs) | ✅ (Assigned) | ✅ (All Docs) |
| **View Original PDF & Extracted Pages** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Retry Failed Processing (`POST /jobs/{id}/retry`)** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Evidence Ledger (`GET /evidence`)** | ✅ | ✅ | ✅ | ✅ (Read-Only) | ✅ (Read-Only) |
| **Semantic Vector Search (`GET /evidence/search`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Evidence Record (`PATCH /evidence/{id}`)** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Verify Evidence Status (`POST /evidence/{id}/verify`)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Entity Register (`GET /entities`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Event Chronology View (`GET /chronology`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create / Edit Chronology Event (`POST/PATCH /chronology`)** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Contradictions View (`GET /contradictions`)** | ✅ | ✅ | ✅ | ✅ (Read-Only) | ✅ (Read-Only) |
| **Review & Justify Contradiction (`POST /contradictions/{id}/review`)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Generate Formal Briefing (`POST /briefings/generate`)** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Edit Briefing Draft (`PATCH /briefings/{id}`)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Regenerate Briefing Section (`POST /briefings/{id}/regenerate-section`)** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Factual Claim Verification (`POST /briefings/{id}/verify`)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Submit Briefing for Review (`POST /briefings/{id}/submit-review`)** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Officially Approve Briefing (`POST /briefings/{id}/approve`)** | ❌ *(SoD Blocked)* | ✅ | ✅ | ❌ | ❌ |
| **Return Briefing for Revision (`POST /briefings/{id}/return`)** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Export Briefing (PDF & DOCX)** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Tamper-Evident Audit Logs (`GET /audit`)** | ❌ *(403)* | ❌ *(403)* | ✅ | ❌ *(403)* | ✅ |
| **Cryptographic Hash-Chain Verification (`/audit/verify-chain`)** | ❌ *(403)* | ❌ *(403)* | ✅ | ❌ *(403)* | ✅ |
| **Export Audit Trail to CSV (`GET /audit/export`)** | ❌ *(403)* | ❌ *(403)* | ✅ | ❌ *(403)* | ✅ |
| **User & Officer Account Admin (`/admin/users`)** | ❌ *(Hidden/403)* | ❌ *(Hidden/403)* | ✅ | ❌ *(Hidden/403)* | ❌ *(Hidden/403)* |
| **AI Component Readiness Telemetry (`/admin/ai-services`)** | ❌ *(Hidden/403)* | ❌ *(Hidden/403)* | ✅ | ❌ *(Hidden/403)* | ❌ *(Hidden/403)* |
| **System & Queue Diagnostics (`/admin/system`)** | ❌ *(Hidden/403)* | ❌ *(Hidden/403)* | ✅ | ❌ *(Hidden/403)* | ❌ *(Hidden/403)* |

---

## 4. Deep-Dive: Roles, Features & Access Controls

### 4.1. Investigating Officer (`investigating_officer`)

#### Role Mandate
Operational frontline investigator responsible for conducting factual inquiries, ingesting exhibits, analyzing evidence, reconciling contradictions, and drafting 14-section formal investigation briefings.

#### Frontend UI & Menu Access
* **Visible Menu Sections:**
  * **Core Operations:** Dashboard, Case Register, Document Intake, Document Library, Processing Queue.
  * **Intelligence & Evidence:** Evidence Ledger, Evidence Search, Entity Register, Event Chronology, Contradiction Analysis, Investigation Briefings.
* **Restricted / Blocked UI Elements:**
  * Governance & Administration menu is hidden. Attempting to navigate directly to `/admin/*` or `/audit-logs` triggers a `403 Forbidden` screen.
  * Official approval button on Briefings is disabled/disallowed under Separation of Duties.

#### Core Features & Capabilities
1. **Case Workspace Management:**
   * Create new case dossiers (`POST /api/v1/cases`).
   * Update case title, description, category, and priority (`PATCH /api/v1/cases/{case_id}`).
2. **Evidence Ingestion & Pipeline Oversight:**
   * Upload exhibit PDFs through the Document Intake dropzone (`POST /api/v1/documents/upload`).
   * Trigger processing retry for documents or jobs stalled in the pipeline (`POST /api/v1/documents/{id}/retry` and `POST /api/v1/jobs/{id}/retry`).
3. **Evidence Extraction & Vector Search:**
   * Query the multi-lingual evidence base via semantic vector similarity (Qdrant) and keyword filters (`GET /api/v1/evidence/search`).
   * Edit normalized text, update associated entities, and adjust categorization (`PATCH /api/v1/evidence/{id}`).
   * Mark evidence items as `verified`, `rejected`, or `flagged` (`POST /api/v1/evidence/{id}/verify`).
4. **Chronology & Contradiction Resolution:**
   * Manually register and calibrate chronological events (`POST /api/v1/chronology` and `PATCH /api/v1/chronology/{event_id}`).
   * Review side-by-side AI-flagged contradictions, provide operational justification notes, and confirm findings (`POST /api/v1/contradictions/{id}/review`).
5. **Investigation Briefing Lifecycle:**
   * Generate 14-section standardized briefings with automated evidence citations (`POST /api/v1/briefings/generate`).
   * Regenerate individual briefing sections against newly ingested case data (`POST /api/v1/briefings/{id}/regenerate-section`).
   * Edit section draft text in the review editor (`PATCH /api/v1/briefings/{id}`).
   * Independently verify claims against primary document citations (`POST /api/v1/briefings/{id}/verify`).
   * Formally submit the completed briefing draft to the Supervisory Review Commissioner (`POST /api/v1/briefings/{id}/submit-review`).

#### Security & Separation Boundaries
* **Separation of Duties Enforcement:** Cannot officially approve their own briefing submission. If an investigator attempts to call `POST /briefings/{id}/approve`, the backend rejects it with:
  > `"Separation of duties violation: An investigating officer cannot approve their own briefing. Supervisory reviewer required."`
* Cannot assign other officers to cases or archive cases.
* Cannot view the agency audit log or system telemetry.

---

### 4.2. Supervisory Reviewer (`supervisory_reviewer`)

#### Role Mandate
Senior supervisory authority and review commissioner responsible for case assignment, quality assurance of investigative findings, judicial review of contradictions, and final sign-off on briefings.

#### Frontend UI & Menu Access
* **Visible Menu Sections:**
  * **Core Operations:** Dashboard, Case Register, Document Library, Processing Queue.
  * **Intelligence & Evidence:** Evidence Ledger, Evidence Search, Entity Register, Event Chronology, Contradiction Analysis, Investigation Briefings.
* **Restricted / Blocked UI Elements:**
  * Document Intake (`/intake`) upload triggers access denial.
  * Administrative routes (`/admin/*`) and `/audit-logs` display `403 Forbidden`.

#### Core Features & Capabilities
1. **Case Allocation & Archival:**
   * Reassign or append investigating officers to active cases (`POST /api/v1/cases/{case_id}/assign`).
   * Officially archive completed or dismissed cases (`POST /api/v1/cases/{case_id}/archive`).
2. **Quality Assurance & Verification:**
   * Perform independent evidence verification across all exhibits (`POST /api/v1/evidence/{id}/verify`).
   * Review contradiction determinations and provide supervisory concurring/dissenting notes (`POST /api/v1/contradictions/{id}/review`).
3. **Claim Verification Workspace:**
   * Review claims extracted in briefings against primary source citations.
   * Update claim verification statuses (`Supported`, `Partially Supported`, `Conflicting Evidence`, `Unsupported`, `Requires Human Review`) (`POST /api/v1/briefings/{id}/verify`).
4. **Three-Column Briefing Review & Approval:**
   * Access the 3-column review workspace displaying Briefing Content, Evidence Excerpts, and Primary Document Pages.
   * Edit briefing text directly or attach review notes (`PATCH /api/v1/briefings/{id}`).
   * **Approve Briefing:** Officially approve and finalize the briefing, transitioning it to immutable status with a cryptographic audit stamp (`POST /api/v1/briefings/{id}/approve`).
   * **Return for Revision:** Return an inadequate draft back to the Investigating Officer with mandatory revision instructions (`POST /api/v1/briefings/{id}/return`).
5. **Dossier Export:**
   * Export final briefings with complete source citations and verification annexures in PDF or DOCX format.

#### Security & Separation Boundaries
* Cannot originate new cases (`POST /cases` is restricted).
* Cannot upload documents via intake (`POST /documents/upload` is restricted to Intake and Investigating Officers).
* Cannot regenerate sections from AI prompts.
* Cannot approve a briefing if they were listed as its author (prevents self-approval).

---

### 4.3. System Administrator (`system_administrator`)

#### Role Mandate
Technical and security administrator responsible for platform health, officer user provisioning, role assignments, AI processing engine readiness, and system-wide infrastructure monitoring.

#### Frontend UI & Menu Access
* Full, unrestricted access to all routes and menus.
* Exclusive access to the **Governance & Administration** sidebar section:
  * **Officer Accounts (`/admin/users`)**
  * **AI Pipeline Readiness (`/admin/ai-services`)**
  * **System Health (`/admin/system`)**
  * **Tamper-Evident Audit (`/audit-logs`)**

#### Core Features & Capabilities
1. **Officer & Role Administration (`/admin/users`):**
   * Create officer accounts with designated security roles (`system_administrator`, `intake_officer`, `investigating_officer`, `supervisory_reviewer`, `auditor`) (`POST /api/v1/admin/users`).
   * Edit user profiles, assign specific case access scopes (`assigned_cases`), or reset passwords (`PATCH /api/v1/admin/users/{user_id}`).
   * Administratively disable compromised or retired accounts (`status: "disabled"`), which immediately revokes JWT session access.
2. **AI Pipeline Readiness Diagnostics (`/admin/ai-services`):**
   * Real-time monitoring and parameter inspection for all pipeline engines:
     * **PyMuPDF Parser:** Digital PDF parsing, layout analysis, table boundary detection.
     * **Tesseract OCR:** Multi-language OCR availability (English, Hindi, Gujarati).
     * **Language Identification:** Unicode script and statistical language detection.
     * **IndicTrans2:** Neural translation service status and Indic GPU/CPU models.
     * **NLTK Preprocessor:** Punkt sentence tokenizer and lemmatization status.
     * **Government NER:** Entity recognition categories (Person, Organization, Department, Location, Date, Monetary Amount, Vehicle ID, Reference Number).
     * **Ollama LLM Provider:** Model availability, context window size, latency.
     * **Vector Database (Qdrant):** Collection health, vector dimensions, index count.
     * **Object Storage Adapter:** Local/MinIO repository connectivity.
3. **System Telemetry & Health Monitoring (`/admin/system`):**
   * Real-time ping diagnostics for MongoDB database cluster.
   * Queue metrics: Active processing jobs, Queued jobs, and Failed jobs.
   * Celery and background worker task runner status.
4. **Administrative Override:**
   * The System Administrator possesses universal bypass clearance across `require_roles` and `check_case_access`.

---

### 4.4. Intake Officer (`intake_officer`)

#### Role Mandate
Central registry intake officer responsible for the physical-to-digital evidence chain of custody, receiving exhibits, running cryptographic hash deduplication checks, and registering new cases.

#### Frontend UI & Menu Access
* **Visible Menu Sections:**
  * **Core Operations:** Dashboard, Case Register, Document Intake, Document Library, Processing Queue.
  * **Intelligence & Evidence:** Read-only access to Evidence Ledger, Search, Entities, and Chronology.
* **Restricted / Blocked UI Elements:**
  * Contradiction reviews and Briefing generation/approvals are restricted.
  * Admin and Audit facilities trigger `403 Forbidden`.

#### Core Features & Capabilities
1. **Case Intake Registration:**
   * Register incoming formal cases into the system (`POST /api/v1/cases`).
2. **Document Ingestion Dropzone (`/intake`):**
   * Upload single or batch PDF exhibits (`POST /api/v1/documents/upload`).
   * Enter critical exhibit metadata:
     * Exhibit Title
     * Category (Official Audit Report, Land Registry Deed, Vendor Invoice, FIR, Sanction Order)
     * Source Authority (e.g. Principal Accountant General, Collectorate Office)
     * Received Date and Custody Remarks.
3. **Cryptographic Deduplication & Integrity Verification:**
   * The upload pipeline computes a SHA-256 hash of the uploaded document bytes.
   * If a duplicate file already exists, the system flags an immediate alert with the existing Document ID and matching checksum, preventing accidental duplicate exhibit submissions.
4. **Document Inspection:**
   * View ingested exhibits in the Document Library and review extracted pages in the Document Viewer.

#### Security & Separation Boundaries
* Cannot modify extracted evidence text or change verification statuses.
* Cannot review or resolve legal contradictions.
* Cannot generate, edit, or approve investigation briefings.
* Cannot access administrative settings or audit logs.

---

### 4.5. Independent Auditor (`auditor`)

#### Role Mandate
Independent vigilance auditor and judicial inspector responsible for verifying the legal integrity, chain of custody, and non-repudiation of all digital records and investigation workflows.

#### Frontend UI & Menu Access
* Read-only access across the entire agency workspace without case-level restriction.
* Exclusive shared access with System Admin to **Tamper-Evident Audit (`/audit-logs`)**.
* Administrative management screens (`/admin/*`) are hidden and restricted.

#### Core Features & Capabilities
1. **Tamper-Evident Audit Ledger (`/audit-logs`):**
   * Inspect the complete chronological event stream: `CASE_CREATED`, `DOCUMENT_UPLOADED`, `DOCUMENT_VIEWED_PDF`, `CLAIM_VERIFIED`, `BRIEFING_EDITED`, `BRIEFING_APPROVED`, etc.
   * Filter audit logs by Officer/Actor, Action Code, Resource Type, and Outcome.
2. **Cryptographic Hash-Chain Verification (`/audit-logs/verify-chain`):**
   * Traces every audit record's SHA-256 hash back to the genesis block:
     $$\text{event\_hash} = \text{SHA256}(\text{previous\_hash} + \text{event\_id} + \text{timestamp} + \text{user\_id} + \text{action} + \text{resource\_id} + \text{outcome})$$
   * Validates that no audit record has been inserted, modified, or deleted directly in MongoDB, verifying non-repudiation.
3. **Export Authoritative Audit Trail:**
   * Download the complete cryptographically hashed audit trail as a certified CSV file for judicial scrutiny (`GET /api/v1/audit/export`).
4. **Agency-Wide Read-Only Visibility:**
   * Access any case file, document, original PDF, evidence excerpt, contradiction analysis, or approved briefing across the entire agency without restriction.

#### Security & Separation Boundaries
* **Strictly Read-Only:** Has zero write permissions across the application.
* Cannot upload files, modify evidence records, create cases, edit briefings, or manage officer accounts.

---

## 5. Security & Governance Rules Reference

### 5.1. Separation of Duties (SoD) Rule
* **Rule:** An Investigating Officer who drafts an investigation briefing cannot approve that same briefing.
* **Code Reference:** `backend/app/api/v1/endpoints/briefings.py`:
  ```python
  if briefing.get("created_by") == current_user["username"] and current_user.get("role") != UserRole.SYSTEM_ADMINISTRATOR.value:
      raise HTTPException(
          status_code=403,
          detail="Separation of duties violation: An investigating officer cannot approve their own briefing. Supervisory reviewer required."
      )
  ```

### 5.2. Audit Trail Tamper-Proof Chain
* **Rule:** Every significant user action generates an immutable audit record containing the SHA-256 hash of the immediately preceding record.
* **Code Reference:** `backend/app/services/audit_service.py` & `backend/app/api/v1/endpoints/audit.py`:
  * Protected by `require_roles([UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.AUDITOR.value])`.
  * Attempted access by any other role returns HTTP 403 Forbidden.

### 5.3. Approved Briefing Immutability
* **Rule:** Once an investigation briefing is approved by the Supervisory Reviewer, its content cannot be altered.
* **Code Reference:** `backend/app/api/v1/endpoints/briefings.py`:
  ```python
  if briefing.get("status") == "Approved":
      raise HTTPException(
          status_code=400,
          detail="Approved briefings are immutable. Generate a new revision to make changes."
      )
  ```

### 5.4. Account Disabling Policy
* **Rule:** When an administrator toggles an officer's account status to `disabled`, subsequent API calls with existing JWT tokens are immediately blocked at the authentication dependency.
* **Code Reference:** `backend/app/core/permissions.py`:
  ```python
  if user.get("status") == "disabled":
      raise HTTPException(
          status_code=status.HTTP_403_FORBIDDEN,
          detail="Account has been administratively disabled",
      )
  ```
