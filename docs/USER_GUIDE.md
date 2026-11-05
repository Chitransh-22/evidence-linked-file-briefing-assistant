# Government Document Evidence Intelligence & Briefing Management System
## Officer Operational User Guide

---

### Table of Contents
1. [Introduction & Role-Based Access](#1-introduction--role-based-access)
2. [Step 1: Institutional Authentication](#step-1-institutional-authentication)
3. [Step 2: Case Workspace Management](#step-2-case-workspace-management)
4. [Step 3: Multilingual Document Intake & Ingestion](#step-3-multilingual-document-intake--ingestion)
5. [Step 4: Real-Time Processing Queue & Extraction Monitoring](#step-4-real-time-processing-queue--extraction-monitoring)
6. [Step 5: Document Viewer & Side-by-Side Translation](#step-5-document-viewer--side-by-side-translation)
7. [Step 6: Centralized Evidence Ledger & Semantic Retrieval](#step-6-centralized-evidence-ledger--semantic-retrieval)
8. [Step 7: Entity Register & Linkage Analysis](#step-7-entity-register--linkage-analysis)
9. [Step 8: Chronology & Event Reconstruction](#step-8-chronology--event-reconstruction)
10. [Step 9: Contradiction Detection & Officer Determination](#step-9-contradiction-detection--officer-determination)
11. [Step 10: 16-Section Investigation Briefing Synthesis](#step-10-16-section-investigation-briefing-synthesis)
12. [Step 11: Independent Claim Verification Workspace](#step-11-independent-claim-verification-workspace)
13. [Step 12: 3-Column Officer Review & Editing Workspace](#step-12-3-column-officer-review--editing-workspace)
14. [Step 13: Supervisory Sign-off & Separation of Duties](#step-13-supervisory-sign-off--separation-of-duties)
15. [Step 14: Official Publication & Export (PDF & DOCX)](#step-14-official-publication--export-pdf--docx)
16. [Step 15: Tamper-Evident Audit Ledger Verification](#step-15-tamper-evident-audit-ledger-verification)

---

### 1. Introduction & Role-Based Access

The platform provides an AI-assisted decision-support workspace for authorized government officers. The system operates on institutional principles:
- **Traceability**: All findings, claims, and dates map directly to source documents and page numbers.
- **Human in the Loop**: AI provides suggestions, translations, and contradiction alerts; officers make all final determinations.
- **Strict Separation of Duties**: The investigator who drafts a briefing cannot approve it.

---

### Step 1: Institutional Authentication

1. Open your browser and navigate to the application URL (e.g., `http://localhost:5173/login`).
2. Enter your institutional officer username and credentials. Default test accounts:
   - **Case Officer / Investigator**: `investigator` / `OfficerGov2026!`
   - **Supervisory Reviewer**: `reviewer` / `OfficerGov2026!`
   - **Intake Officer**: `intake_officer` / `OfficerGov2026!`
   - **Independent Auditor**: `auditor` / `OfficerGov2026!`
   - **System Administrator**: `admin` / `AdminSecureGov2026!`
3. Click **Authenticate & Enter Secure System**. Upon successful authentication, your active classification clearance and operational role will be displayed in the top header.

---

### Step 2: Case Workspace Management

1. Access the **Case Register** (`/cases`) from the left navigation bar.
2. Select an active case workspace (e.g., `CR-2026-GUJ-042: Operation Clean Ledger`) or click **Register New Case** to initiate a new inquiry.
3. The **Case Detail View** (`/cases/:caseId`) displays real-time statistics on registered documents, verified evidence items, identified contradictions, and generated briefings.

---

### Step 3: Multilingual Document Intake & Ingestion

1. Navigate to **Document Intake** (`/intake`).
2. Select the target case workspace.
3. Drag and drop single or multiple PDF documents into the upload dropzone, or click **Browse Files**.
4. Complete the required statutory metadata:
   - **Document Title**: Official name of the record.
   - **Category**: Classify as `Official Record`, `Financial Record`, `Court Pleading`, `Correspondence`, `Technical Report`, or `Affidavit`.
   - **Source Authority**: Name of issuing body (e.g., *Gujarat Maritime Board*).
   - **Reference Number**: Official file docket number.
   - **Date Received**: Date of receipt into the official repository.
5. Click **Upload & Ingest Documents**.
6. The Ingestion Engine validates the PDF header, calculates the SHA-256 checksum, verifies duplicate status, and dispatches the file to the asynchronous pipeline.

---

### Step 4: Real-Time Processing Queue & Extraction Monitoring

1. Open the **Processing Queue** (`/processing`).
2. Active jobs display live progress percentage and current stage:
   - *File Validation* → *PyMuPDF Parsing / Tesseract OCR* → *Unicode Normalization* → *Language Detection* → *IndicTrans2 Translation* → *Government NER* → *Dense Vector Indexing*.
3. Real-time updates stream automatically over **Server-Sent Events (SSE)** without page refreshes.

---

### Step 5: Document Viewer & Side-by-Side Translation

1. Click on any document in the **Document Library** (`/documents`) to enter the **Document Viewer** (`/documents/:documentId`).
2. Features available:
   - **Side-by-Side Translation**: View original Gujarati or Hindi text on the left, with aligned English translation on the right.
   - **OCR Quality Warnings**: Pages with low scan clarity display an alert banner: `Low OCR Confidence - Review Original Scan`.
   - **Original PDF Download**: Access the unmodified source PDF from immutable storage.
   - **Entity Highlights**: Click highlighted entity chips to jump to their occurrences.

---

### Step 6: Centralized Evidence Ledger & Semantic Retrieval

1. Navigate to **Evidence Ledger** (`/evidence`).
2. Review extracted factual assertions, monetary values, and statutory citations.
3. Filter by **Evidence Type**, **Source Language**, or **Verification Status**.
4. Officers can verify assertions, add verification notes, or mark an item as verified.
5. Click **Evidence Search** (`/evidence/search`) to perform hybrid semantic searches using natural language queries (e.g., *"unauthorized cash disbursements"*).

---

### Step 7: Entity Register & Linkage Analysis

1. Navigate to **Entity Register** (`/entities`).
2. Entities are organized into 12 institutional categories (e.g., *Individual*, *Department*, *Monetary Amount*, *Act/Law/Section*, *Vehicle Number*).
3. Click any entity to view its canonical aliases, mention frequency, and cross-document co-occurrences.

---

### Step 8: Chronology & Event Reconstruction

1. Access **Chronology** (`/chronology`).
2. The interactive timeline arranges normalized events sequentially.
3. Filter by date ranges or significance (`Critical`, `High`, `Medium`, `Low`).
4. Click on any event to view supporting documentary evidence and source page citations.

---

### Step 9: Contradiction Detection & Officer Determination

1. Navigate to **Contradictions** (`/contradictions`).
2. Review AI-identified pairwise discrepancies between documents (e.g., conflicting dates or disputed inspection reports).
3. Click **Review & Resolve Contradiction**:
   - Choose a determination: `Corroborated Discrepancy`, `Dismissed / Explainable`, or `Referred for Further Probe`.
   - Enter your official officer notes.
   - Click **Save Official Determination**.

---

### Step 10: 16-Section Investigation Briefing Synthesis

1. Navigate to **Briefings** (`/briefings`) and click **Generate Briefing**.
2. Select your case workspace and review the 16 structured sections:
   - Executive Summary, Case Background, Jurisdiction, Chronology, Key Entities, Evidentiary Findings, Financial Analysis, Contradictions, Legal Provisions, Gaps in Evidence, Investigative Actions, Risk Assessment, Recommended Actions, Annexures, Officer Certification, Supervisory Endorsement.
3. Click **Synthesize Structured Briefing**.

---

### Step 11: Independent Claim Verification Workspace

1. From the briefing detail, open the **Claim Verification Workspace** (`/briefings/:briefingId/verification`).
2. Each factual assertion in the briefing is isolated as an atomic claim.
3. Review verbatim source quotes and page citations.
4. Mark each claim as:
   - `Verified`: Ground truth explicitly corroborated.
   - `Partially Supported`: Corroborated with caveats.
   - `Unsupported`: Insufficient evidence in ingested files.
   - `Contradicted`: Disputed by another source document.

---

### Step 12: 3-Column Officer Review & Editing Workspace

1. Navigate to **Officer Review** (`/briefings/:briefingId/review`).
2. The 3-column workspace presents:
   - **Left Column**: Source evidence ledger items and original document citations.
   - **Center Column**: Rich editable narrative text for all 16 sections.
   - **Right Column**: Claim verification status panel and supervisor review history.
3. Make required edits to refine legal phrasing, add observations, or revise recommendations.
4. Click **Save Draft Changes**.
5. When ready, click **Submit Briefing for Supervisory Review**.

---

### Step 13: Supervisory Sign-off & Separation of Duties

1. Log out and authenticate as a **Supervisory Reviewer** (`reviewer`).
2. Open the pending briefing in the **Officer Review Workspace**.
3. Inspect claim verification statuses and draft narrative text.
4. The system validates the **Separation of Duties**: the reviewer must not be the drafting author.
5. Click **Approve & Endorse Briefing**.
6. The briefing status updates to `approved`, locking the narrative and generating an immutable audit record.

---

### Step 14: Official Publication & Export (PDF & DOCX)

1. Open an approved briefing.
2. Click **Export Official PDF**:
   - Downloads a formal document complete with government insignia, classification banners, section headers, evidence citations, and formal signature blocks.
3. Click **Export Word Document (.docx)**:
   - Generates an editable Microsoft Word document conforming to standard government layout guidelines.

---

### Step 15: Tamper-Evident Audit Ledger Verification

1. Log in as an **Auditor** or **Admin** and navigate to **Audit Logs** (`/audit-logs`).
2. Inspect the append-only chronological log of all officer activities, case modifications, and briefings.
3. Click **Verify Cryptographic Chain**:
   - The engine validates SHA-256 block hashes from block 0 to the latest record.
   - A success banner confirms: `Audit Chain Valid: Cryptographic Integrity Intact`.
