# Government Document Evidence Intelligence & Briefing Management System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61DAFB.svg)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Async-47A248.svg)](https://www.mongodb.com)
[![License](https://img.shields.io/badge/Security-Government%20Classified%20Standard-183153.svg)](#security--governance)

An institutional, enterprise-grade decision-support platform designed for authorized government officers and law enforcement agencies. The system ingests, normalizes, translates, analyzes, and indexes complex multilingual PDF records (Gujarati, Hindi, English), extracting structured evidence and synthesizing verified, traceable 16-section investigation briefings.

---

## Authoritative System Architecture

The application is structured into six sequential architectural stages:

```mermaid
flowchart TD
    subgraph STAGE1["Stage 1: Ingestion & Routing"]
        A1["PDF Upload (Single/Batch)"] --> A2["SHA-256 Checksum & Duplicate Detection"]
        A2 --> A3["Immutable Original Object Storage"]
        A2 --> A4["MongoDB Metadata Record"]
    end

    subgraph STAGE2["Stage 2: Format Extraction & Dispatch"]
        A4 --> B1{"Digital or Scanned?"}
        B1 -->|Digital| B2["PyMuPDF Layout Parser"]
        B1 -->|Scanned| B3["Tesseract OCR (Eng/Hin/Guj)"]
        B2 --> B4["Common Extraction API"]
        B3 --> B4
        B4 --> B5["Intermediate Storage & RabbitMQ / Celery Queue"]
    end

    subgraph STAGE3["Stage 3: Normalization & Multilingual NLP"]
        B5 --> C1["Unicode NFKC Normalization & Layout Structuring"]
        C1 --> C2["Script Language Detection (Guj/Hin/Eng)"]
        C2 -->|English| C3["Explicit English Bypass"]
        C2 -->|Gujarati / Hindi| C4["IndicTrans2 Translation"]
        C3 --> C5["NLTK Preprocessing & Lemmatization"]
        C4 --> C5
    end

    subgraph STAGE4["Stage 4: AI Extraction & Vector Indexing"]
        C5 --> D1["Government NER (12 Institutional Classes)"]
        C5 --> D2["Pydantic-Grounded LLM Extraction"]
        C5 --> D3["Semantic Chunking & Dense Embeddings"]
        D3 --> D4["Qdrant Vector Database Indexing"]
    end

    subgraph STAGE5["Stage 5: Central Evidence Ledger & Intelligence"]
        D1 --> E1["Centralized MongoDB Evidence Ledger"]
        D2 --> E1
        E1 --> E2["Chronological Event Engine"]
        E1 --> E3["Pairwise Contradiction Detection"]
        D4 -.-> E4["Hybrid Semantic Evidence Retrieval"]
        E1 -.-> E4
    end

    subgraph STAGE6["Stage 6: Briefing Synthesis & Supervisory Review"]
        E4 --> F1["16-Section Briefing Generator"]
        E2 --> F1
        E3 --> F1
        F1 --> F2["Independent Claim Verification Workspace"]
        F2 --> F3["3-Column Officer Review & Rich Editing"]
        F3 --> F4["Supervisory Approval (Separation of Duties)"]
        F4 --> F5["High-Fidelity PDF & DOCX Export"]
        F4 --> F6["Tamper-Evident SHA-256 Audit Chain"]
    end
```

---

## Key Platform Capabilities

- **Zero-Fabrication Guarantee**: All extracted evidence, events, and claims must link verbatim to a source document ID, page number, and bounding box coordinates.
- **Multilingual Support**: First-class support for **Gujarati (`gu`)**, **Hindi (`hi`)**, and **English (`en`)** documents. English undergoes explicit bypass to preserve legal nuance without lossy round-trips.
- **Government NER**: 12 institutional entity categories: Individuals, Departments, Designations, Locations, Dates, Monetary Amounts, Acts/Sections, Case/FIR Numbers, Companies, Vehicle Numbers, Assets/Properties, and Communication Identifiers.
- **Strict Separation of Duties (Maker-Checker)**: Briefing authors cannot approve their own briefings; supervisors must verify independent atomic claims prior to sign-off.
- **Tamper-Evident Audit Ledger**: SHA-256 cryptographic hash-chained transaction ledger with automated end-to-end mathematical verification.
- **21 Dedicated Government Interfaces**: Institutional, high-contrast, restrained color scheme (#183153 navy, #334155 slate, no neon/crypto aesthetics).

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Backend API** | Python 3.11, FastAPI 0.115, Pydantic v2, Motor (Async MongoDB), PyMuPDF (fitz), pytesseract, NLTK, ReportLab, python-docx |
| **Worker & Queue** | Celery 5.4, RabbitMQ 3.13, Server-Sent Events (SSE) for live streaming |
| **Storage & Vectors** | MinIO (S3-compatible Object Storage), Qdrant Vector DB, In-Memory Dense Fallback |
| **Frontend** | React 19, Vite 6, React Router v7, TanStack Query v5, Lucide React, Design Tokens CSS |
| **Containerization** | Docker, Docker Compose, Nginx Reverse Proxy |

---

## Directory Structure

```text
SFIC/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Modular API routes (auth, cases, documents, jobs, evidence, etc.)
│   │   ├── core/            # Configuration, Security, RBAC, Logging, Exceptions
│   │   ├── db/              # MongoDB connection, Index provisioning, Initial seeding
│   │   ├── integrations/    # PyMuPDF, Tesseract, IndicTrans2, LLM, Embeddings, Qdrant, MinIO
│   │   ├── models/          # Domain Pydantic schemas & Document models
│   │   ├── pipelines/       # 19-stage pipeline orchestrator, Normalization, LangDetect, NLP
│   │   ├── services/        # Audit service (hash chain), Briefing service, Export service
│   │   ├── workers/         # Celery application & asynchronous worker tasks
│   │   └── main.py          # FastAPI application entrypoint
│   ├── tests/
│   │   ├── api/             # API endpoint tests
│   │   ├── integration/     # Full 24-step end-to-end integration test
│   │   └── unit/            # Security, NER, Normalizer unit tests
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/             # App entry, Router (all 21 routes), Query providers
│   │   ├── components/      # Common UI (StatusBadge, DataTable, Modal, AlertBanner)
│   │   ├── features/        # 21 institutional feature pages grouped by domain
│   │   ├── layouts/         # Main institutional navigation shell & topbar
│   │   ├── services/api/    # Axios HTTP client with JWT interceptors
│   │   ├── store/           # Auth store with role permissions
│   │   └── styles/          # Government tokens.css, global.css, layout.css
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── ARCHITECTURE.md      # Detailed system architecture specification
│   ├── API.md               # OpenAPI/REST endpoint documentation with payloads
│   ├── DATABASE.md          # 15 MongoDB collections, document layouts, indexes
│   ├── AI_PIPELINE.md       # 19 pipeline stages, IndicTrans2, NER, embeddings
│   ├── SECURITY.md          # RBAC matrix, Separation of Duties, SHA-256 audit chaining
│   ├── DEPLOYMENT.md        # Docker Compose & Standalone deployment guide
│   └── USER_GUIDE.md         # Step-by-step operational officer guide
├── infrastructure/
│   ├── docker/              # Dockerfile.backend, Dockerfile.frontend
│   ├── nginx/               # Nginx reverse proxy configuration
│   └── scripts/             # start_all.bat, start_all.sh startup scripts
├── docker-compose.yml       # 7-container deployment configuration
├── .env.example             # Documented environment variables template
└── README.md                # Project documentation
```

---

## Quick Start Guide

### Option 1: Native Standalone Execution

#### 1. Setup Backend
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python app/db/seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

### Option 2: Docker Compose Deployment

Ensure Docker Engine and Docker Compose are running:

```bash
# Clone and enter directory
cd SFIC

# Configure environment
cp .env.example .env

# Launch entire stack
docker compose up -d --build

# Initialize indexes and seed administrative accounts
docker compose exec backend python app/db/seed.py
```

The system endpoints:
- **Application Portal**: `http://localhost` (Port 80)
- **FastAPI OpenAPI Docs**: `http://localhost:8000/docs`
- **MinIO Storage Console**: `http://localhost:9001`
- **RabbitMQ Dashboard**: `http://localhost:15672`
- **Qdrant Vector Dashboard**: `http://localhost:6333/dashboard`

---

## Seed Accounts & Role Credentials

The database seeder (`backend/app/db/seed.py`) initializes 5 default accounts spanning the institutional hierarchy:

| Role | Username | Password | Operational Scope |
|---|---|---|---|
| **System Administrator** | `admin` | `AdminSecureGov2026!` | User management, system metrics, AI engine readiness |
| **Case Officer / Investigator** | `investigator` | `OfficerGov2026!` | Case creation, document upload, evidence analysis, briefing draft |
| **Supervisory Reviewer** | `reviewer` | `OfficerGov2026!` | Claim verification, officer review, briefing approval sign-off |
| **Intake Officer** | `intake_officer` | `OfficerGov2026!` | Document upload, checksum verification, intake routing |
| **Independent Auditor** | `auditor` | `OfficerGov2026!` | Read-only ledger inspection, cryptographic audit verification |

*A pre-loaded demonstration case `CR-2026-GUJ-042: Operation Clean Ledger` is also created with sample Gujarati and English records.*

---

## Automated Verification & Testing

### Backend Test Suite
Run the full unit, API, and 24-step integration test suites:
```bash
# Run Unit & API Endpoint Tests
pytest backend/tests/unit backend/tests/api -v

# Run End-to-End Multi-Step Integration Test
pytest backend/tests/integration/test_full_workflow.py -v
```
*Current test status: 20 passed, 0 failed.*

### Frontend Verification Suite
```bash
cd frontend

# Run Component Tests
npm test

# Run Production Build
npm run build
```
*Current frontend build status: 0 errors, 100% production ready.*

---

## Documentation Links

- [System Architecture Specification](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/docs/ARCHITECTURE.md)
- [REST API Reference & Payloads](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/docs/API.md)
- [Database Schema & Collections](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/docs/DATABASE.md)
- [AI Pipeline & NER Specification](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/docs/AI_PIPELINE.md)
- [Security, RBAC & Audit Ledger](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/docs/SECURITY.md)
- [Deployment & Operations Manual](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/docs/DEPLOYMENT.md)
- [Officer Operational User Guide](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/docs/USER_GUIDE.md)

---

## Acceptance Criteria Compliance

| Architectural Requirement | Implementation Status | Grounding File / Module |
|---|:---:|---|
| **Stage 1: Document Intake** | **COMPLIANT** | [`backend/app/api/v1/documents.py`](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/backend/app/api/v1/documents.py), SHA-256 duplicate alert |
| **Stage 2: Format Extraction** | **COMPLIANT** | [`backend/app/integrations/pdf_parser/parser.py`](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/backend/app/integrations/pdf_parser/parser.py), [`ocr.py`](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/backend/app/integrations/ocr_provider/ocr.py) |
| **Stage 3: Normalization & Lang** | **COMPLIANT** | Unicode NFKC, Gujarati/Hindi/English detector, IndicTrans2 with bypass |
| **Stage 4: AI Extraction & Index** | **COMPLIANT** | 12 Government NER classes, Pydantic-grounded LLM, Qdrant vectors |
| **Stage 5: Central Evidence Ledger**| **COMPLIANT** | MongoDB ledger, Chronology engine, Contradiction engine |
| **Stage 6: Briefing & Review** | **COMPLIANT** | 16-section generator, Claim verification, 3-column review, PDF/DOCX |
| **Separation of Duties** | **COMPLIANT** | Maker-checker rule enforced at API level (`author != reviewer`) |
| **Tamper-Evident Audit** | **COMPLIANT** | Append-only SHA-256 cryptographic hash-chained audit ledger |
| **21 Government Pages** | **COMPLIANT** | All 21 institutional pages fully interactive in [`frontend/src/features/`](file:///F:/Shashwat_Mandali/Coding%20Script/SFIC/frontend/src/features/) |
| **No Neon/SaaS UI** | **COMPLIANT** | Institutional Navy (`#183153`), Slate (`#334155`), Off-white (`#F8FAFC`) |
