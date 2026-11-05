# Government Document Evidence Intelligence & Briefing Management System
## Security Architecture, RBAC & Audit Ledger Specification

---

### Table of Contents
1. [Security Architecture Overview](#1-security-architecture-overview)
2. [Role-Based Access Control (RBAC) Matrix](#2-role-based-access-control-rbac-matrix)
3. [Strict Separation of Duties (Maker-Checker Principle)](#3-strict-separation-of-duties-maker-checker-principle)
4. [Tamper-Evident SHA-256 Chained Audit Ledger](#4-tamper-evident-sha-256-chained-audit-ledger)
5. [Document Integrity & Immutable Storage](#5-document-integrity--immutable-storage)
6. [Authentication & Credential Security](#6-authentication--credential-security)
7. [Operational & Network Defenses](#7-operational--network-defenses)

---

### 1. Security Architecture Overview

This platform processes sensitive official and evidentiary records. The security model is designed to prevent unauthorized disclosure, guarantee evidential chain-of-custody, and enforce institutional integrity standards across government investigations.

Key pillars:
- **Zero Fabricated Evidence**: Only verified extractions and auditable citations can be included in formal briefings.
- **Cryptographic Auditability**: Every administrative action, view, edit, verification, and export is recorded in an immutable, append-only SHA-256 chained ledger.
- **Non-Repudiation**: Officers cannot delete or modify historical actions or claim verifications.
- **Credential & Secret Isolation**: Backend secrets are never exposed to frontend bundles or committed to version control.

---

### 2. Role-Based Access Control (RBAC) Matrix

The system provides 5 institutional roles:

| Module / Permission | System Admin (`admin`) | Investigation Officer (`investigator`) | Supervisory Reviewer (`reviewer`) | Intake Officer (`intake_officer`) | Independent Auditor (`auditor`) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Case Register (View)** | ✓ | ✓ | ✓ | ✓ | ✓ (Read-only) |
| **Case Creation / Edit** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Document Intake / Upload** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Document Processing Queue**| ✓ | ✓ | ✓ | ✓ | ✓ (Read-only) |
| **Original PDF Download** | ✓ | ✓ (Assigned) | ✓ (Assigned) | ✗ | ✗ |
| **Evidence Ledger (View/Search)**| ✓ | ✓ | ✓ | ✗ | ✓ (Read-only) |
| **Evidence Verification / Edit**| ✗ | ✓ | ✓ | ✗ | ✗ |
| **Entity Register & Graphs** | ✓ | ✓ | ✓ | ✗ | ✓ (Read-only) |
| **Chronology Timeline** | ✓ | ✓ | ✓ | ✗ | ✓ (Read-only) |
| **Contradiction Resolution** | ✗ | ✓ | ✓ | ✗ | ✗ |
| **Briefing Generation** | ✗ | ✓ | ✓ | ✗ | ✗ |
| **Briefing Claim Verification**| ✗ | ✓ | ✓ | ✗ | ✗ |
| **Briefing Supervisory Sign-off**| ✗ | ✗ (Enforced) | ✓ (Enforced) | ✗ | ✗ |
| **Briefing Export (PDF / Word)**| ✗ | ✓ | ✓ | ✗ | ✓ |
| **Audit Ledger Inspection** | ✓ | ✗ | ✗ | ✗ | ✓ |
| **Audit Chain Cryptographic Check**| ✓ | ✗ | ✗ | ✗ | ✓ |
| **User & AI Service Administration**| ✓ | ✗ | ✗ | ✗ | ✗ |

---

### 3. Strict Separation of Duties (Maker-Checker Principle)

To prevent conflicts of interest and maintain statutory compliance:

1. **Maker Cannot Be Checker**:
   - The officer who author/drafts a briefing cannot approve or formally endorse that same briefing.
   - Attempting to approve a briefing where `author_officer_id == current_user.username` is rejected by the backend with HTTP `403 Forbidden`:
     ```json
     {
       "detail": "Separation of Duties Violation: Briefing author cannot approve their own briefing."
     }
     ```
2. **Reviewer Must Endorse Independent Claim Verification**:
   - Before a briefing can be transitioned to `approved` state, all atomic claims must have an explicit officer determination (`verified`, `partially_supported`, `unsupported`, or `contradicted`).
3. **Auditor Isolation**:
   - Auditors have access exclusively to audit logs, ledger inspection, and chain verification tools; they cannot alter evidence, create briefings, or modify case records.

---

### 4. Tamper-Evident SHA-256 Chained Audit Ledger

The `audit_ledger` collection operates as a cryptographic ledger:

```
[Genesis Block: hash_0]
       │
       ▼
[Record 1: SHA256(hash_0 + payload_1) -> hash_1]
       │
       ▼
[Record 2: SHA256(hash_1 + payload_2) -> hash_2]
       │
       ▼
[Record N: SHA256(hash_{N-1} + payload_N) -> hash_N]
```

#### Hash Chaining Algorithm
For each event, the record hash is computed in [`backend/app/services/audit_service.py`](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/backend/app/services/audit_service.py):

$$\text{record\_payload} = \text{sequence} \;\|\; \text{timestamp} \;\|\; \text{officer\_id} \;\|\; \text{action} \;\|\; \text{resource\_type} \;\|\; \text{resource\_id} \;\|\; \text{details\_json}$$

$$\text{record\_hash} = \text{SHA-256}(\text{previous\_hash} + \text{record\_payload})$$

#### Verification & Tamper Detection
Any backdated modification, record deletion, or unauthorized field change alters the computed SHA-256, breaking the link to all subsequent records.
The API endpoint `POST /api/v1/audit/verify-integrity` re-computes the entire chain from block 0 to $N$:
- If an altered block is detected, the verification halts and flags the exact record index and tamper timestamp.
- Auditors can initiate this check on demand from the **Audit Logs Workspace** (`/audit-logs`).

---

### 5. Document Integrity & Immutable Storage

1. **SHA-256 Checksum on Intake**:
   - When a file is uploaded, its SHA-256 hash is calculated in memory before writing to disk or storage.
   - If the hash matches an existing document, the system notifies the officer of duplication and prevents overwriting the original file.
2. **Immutable Original Storage Adapter**:
   - Original PDFs are saved to an isolated object bucket (`documents/original/`) with read-only bucket policies.
   - Intermediate outputs (OCR text, translation JSON, extracted page layout) are kept in a separate intermediate store (`documents/intermediate/`).
   - Original documents are never modified or rewritten during parsing or OCR.

---

### 6. Authentication & Credential Security

1. **Password Hashing**:
   - Utilizes native `bcrypt` with salt rounds = 12.
   - Bypasses passlib wrap truncation bugs to safely handle arbitrary password lengths.
2. **JWT Tokens**:
   - Signed using `HS256` with strong 256-bit secret keys.
   - Short expiration intervals with refresh token rotation capability.
   - Contains minimal claims (`sub`, `role`, `department`, `exp`).
3. **Configuration & Secrets**:
   - Configuration is managed via Pydantic `BaseSettings` reading from `.env`.
   - `.env.example` provides complete configuration keys without real secrets.
   - No frontend code contains backend API secrets or database connection strings.

---

### 7. Operational & Network Defenses

- **CORS Restrictions**: Whitelisted to the authorized government intranet domain or reverse proxy origins.
- **Input Validation**: Strict Pydantic models validate all request payloads, rejecting unexpected or malicious JSON keys.
- **Safe File Parsing**: PyMuPDF and Tesseract operate in isolated subprocesses/worker tasks to prevent PDF exploit vectors from compromising the main API thread.
