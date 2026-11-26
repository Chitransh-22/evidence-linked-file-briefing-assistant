# LEKH &mdash; Ledger for Evidence and Knowledge Handling

## Government Document Evidence Intelligence & Briefing Management System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%208-61DAFB.svg)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Async%20Motor-47A248.svg)](https://www.mongodb.com)
[![Qdrant](https://img.shields.io/badge/Vector%20DB-Qdrant%20Hybrid-DC2626.svg)](https://qdrant.tech)
[![Pipeline](https://img.shields.io/badge/NLP%20Pipeline-19--Stage%20Orchestrator-7C3AED.svg)](#the-19-stage-document-processing-pipeline)
[![Audit](https://img.shields.io/badge/Security-SHA--256%20Chained%20Audit-183153.svg)](#cryptographic-tamper-evident-audit-ledger)
[![License](https://img.shields.io/badge/Governance-Institutional%20Government%20Standard-0F172A.svg)](#role-based-access-control-rbac--separation-of-duties)

An institutional, enterprise-grade decision-support platform engineered for authorized government officers, vigilance commissions, audit bodies, and law enforcement agencies. **LEKH** (*Ledger for Evidence and Knowledge Handling*) ingests, normalizes, translates, analyzes, and indexes complex multilingual PDF records (**Gujarati**, **Hindi**, and **English**), extracting structured evidentiary facts and synthesizing verified, traceable **16-section investigation briefings** backed by cryptographic auditability and strict separation of duties.

---

## Table of Contents

- [Core Engineering Tenets](#core-engineering-tenets)
- [Authoritative System Architecture](#authoritative-system-architecture)
- [The 19-Stage Document Processing Pipeline](#the-19-stage-document-processing-pipeline)
- [Key Platform Capabilities](#key-platform-capabilities)
- [Technology Stack](#technology-stack)
- [Repository Directory Structure](#repository-directory-structure)
- [Quick Start Guide](#quick-start-guide)
  - [Option 1: Native Standalone Execution](#option-1-native-standalone-execution)
  - [Option 2: Docker Compose Deployment](#option-2-docker-compose-deployment)
  - [System Port & Service Map](#system-port--service-map)
- [Seed Accounts & Role Credentials](#seed-accounts--role-credentials)
- [Pre-Loaded Demonstration Case (NVD-DR-2026-014)](#pre-loaded-demonstration-case-nvd-dr-2026-014)
- [Role-Based Access Control (RBAC) & Feature Matrix](#role-based-access-control-rbac--feature-matrix)
- [21 Institutional Government Interfaces](#21-institutional-government-interfaces)
- [Automated Verification, Testing & Pipeline Auditing](#automated-verification-testing--pipeline-auditing)
- [Documentation Library](#documentation-library)
- [Acceptance Criteria & Architecture Compliance](#acceptance-criteria--architecture-compliance)

---

## Core Engineering Tenets

1. **Zero-Fabrication Guarantee**: Every extracted fact, timeline event, and briefing claim is strictly anchored to a source document ID, page number, paragraph offset, and verbatim excerpt. Synthetic hallucination is strictly prohibited.
2. **Strict Separation of Duties (Maker-Checker / Four-Eyes Principle)**: Investigating officers who draft briefings are architecturally prevented from approving their own work. Formal approval mandates independent supervisory reviewer sign-off.
3. **Multilingual First-Class Citizen**: Native handling of regional languages (**Gujarati** `gu`, **Hindi** `hi`, and **English** `en`). English documents undergo an **explicit bypass** to preserve exact legal phrasing without lossy round-trip translations.
4. **Tamper-Evident SHA-256 Audit Chaining**: Every state modification (uploads, pipeline processing, claim verification, briefing approval) is immutably recorded in a cryptographically chained ledger ($H_n = \text{SHA-256}(H_{n-1} \parallel \text{CanonicalPayload}_n)$) with automated mathematical integrity validation.
5. **Deterministic Resilient Fallbacks**: If external daemons (Tesseract OCR, Qdrant cluster, Ollama LLM, RabbitMQ broker) are unavailable, the platform automatically activates deterministic local fallbacks (PyMuPDF fallback OCR, embedded Qdrant disk storage, unit-sphere dense vector projection, grounded rule extractor) without runtime failure.

---

## Authoritative System Architecture

The LEKH platform architecture is organized into six sequential tiers:

```mermaid
flowchart TD
    subgraph TIER1["Tier 1: Document Intake & Ingestion"]
        A1["PDF Upload (Single / Batch Drag-and-Drop)"] --> A2["SHA-256 Cryptographic Checksum"]
        A2 --> A3{"Duplicate Checksum?"}
        A3 -->|Yes & Conflict| A4["409 Conflict Rejection"]
        A3 -->|No / Distinct| A5["Immutable Original Object Storage (Local / MinIO S3)"]
        A5 --> A6["MongoDB Document Metadata Record"]
    end

    subgraph TIER2["Tier 2: Format Classification & Extraction"]
        A6 --> B1{"Density Check (>= 40 chars/page?)"}
        B1 -->|Digital PDF| B2["PyMuPDF Layout Parser (Blocks, Spans, BBoxes)"]
        B1 -->|Scanned PDF| B3["Tesseract Multilingual OCR (eng+hin+guj+osd)"]
        B2 --> B4["Canonical Extraction API Schema"]
        B3 --> B4
        B4 --> B5["Intermediate JSON Storage & Job Dispatch (Celery/AsyncIO)"]
    end

    subgraph TIER3["Tier 3: Normalization & Multilingual NLP"]
        B5 --> C1["Unicode NFKC Normalization & Whitespace Sanitation"]
        C1 --> C2["Header / Footer De-duplication Filter"]
        C2 --> C3["Unicode Script Detector (Gujarati, Devanagari, Latin)"]
        C3 -->|English (eng)| C4["Explicit English Bypass (No Translation)"]
        C3 -->|Gujarati (guj) / Hindi (hin)| C5["IndicTrans2 / Deep-Translator Translation Pipeline"]
        C4 --> C6["NLTK Sentence Segmentation & Lexical Tokenization"]
        C5 --> C6
    end

    subgraph TIER4["Tier 4: Government NER & Vector Indexing"]
        C6 --> D1["Government NER (12 Institutional Regex & Vocabulary Classes)"]
        C6 --> D2["Pydantic-Grounded LLM Structured Fact Extractor"]
        C6 --> D3["Sliding Window Chunking (250 words / 50 overlap)"]
        D3 --> D4["Dense Embeddings (Sentence-Transformers all-MiniLM-L6-v2)"]
        D4 --> D5["Qdrant Vector Database (Remote / Embedded Disk / Cosine Fallback)"]
    end

    subgraph TIER5["Tier 5: Central Evidence Ledger & Intelligence Engine"]
        D1 --> E1["Central Evidence Ledger (MongoDB evidence_records)"]
        D2 --> E1
        E1 --> E2["Chronological Event Engine (Normalized YYYY-MM-DD Dates)"]
        E1 --> E3["Pairwise Contradiction Detection Engine"]
        D5 -.-> E4["Hybrid Semantic & Keyword Evidence Retrieval"]
        E1 -.-> E4
    end

    subgraph TIER6["Tier 6: Briefing Synthesis & Supervisory Review"]
        E4 --> F1["16-Section Investigation Briefing Synthesizer"]
        E2 --> F1
        E3 --> F1
        F1 --> F2["Atomic Factual Claim Extraction & Citation Anchoring"]
        F2 --> F3["Claim Verification Workspace (Verified / Contradicted / Unverified)"]
        F3 --> F4["3-Column Officer Review Workspace & Inline Editor"]
        F4 --> F5["Supervisory Approval Workflow (Separation of Duties Enforced)"]
        F5 --> F6["Institutional High-Contrast PDF & DOCX Export"]
        F5 --> F7["Tamper-Evident SHA-256 Hash Chain Ledger Commit"]
    end
```

---

## The 19-Stage Document Processing Pipeline

The backend orchestrator (`backend/app/pipelines/orchestrator.py`) executes a 19-stage pipeline for every ingested document:

```text
[Upload] ──> S1: Ingestion & SHA-256 ──> S2: Document Classification ──> S3: Format Extraction (PyMuPDF / OCR)
                │
                ▼
             S4: Extraction API ──> S5: Intermediate JSON Storage ──> S6: Feature Normalization (NFKC)
                │
                ▼
             S7: Layout Reconstruction ──> S8: Document Structure (Sections) ──> S9: Page-Aware Context
                │
                ▼
             S10: Unicode Script Detection ──> S11: Language Routing / Bypass ──> S12: NLTK Tokenization
                │
                ▼
             S13: Government NER (12 Classes) ──> S14: Pydantic-Grounded LLM ──> S15: Semantic Chunking
                │
                ▼
             S16: Dense Vector Embedding ──> S17: Qdrant Vector Indexing ──> S18: Evidence Ledger & Chronology
                │
                ▼
             S19: Intelligence Analysis & Contradiction Detection ──> [Ready for Review]
```

1. **Stage 1 (Ingestion & Checksum)**: Calculates SHA-256 hash; enforces uniqueness unless duplicate override is specified; saves original file to object storage under `DOC-{uuid}_{filename}`.
2. **Stage 2 (Classification)**: Computes text density; classifies as `digital` ($\ge 40$ characters/page) or `scanned` ($< 40$ characters/page).
3. **Stage 3 (Extraction)**: Extracts digital text with bounding boxes `[x0, y0, x1, y1]` via PyMuPDF or invokes 300 DPI Tesseract OCR (`eng+hin+guj+osd`).
4. **Stage 4 (Extraction API)**: Standardizes output into a unified JSON format (`page_number`, `original_text`, `ocr_text`, `extraction_method`, `ocr_confidence`).
5. **Stage 5 (Intermediate Storage)**: Saves raw extraction to intermediate storage for replayability and audit inspection (`raw_extraction_{job_id}.json`).
6. **Stage 6 (Feature Normalization)**: Applies Unicode NFKC normalization; cleans unprintable control characters; eliminates recurring running headers/footers.
7. **Stage 7 (Layout Reconstruction)**: Reconstructs paragraphs and reading sequence from bounding boxes.
8. **Stage 8 (Document Structure)**: Identifies headings and logical sections (`document_sections` collection).
9. **Stage 9 (Page-Aware Context)**: Attaches immutable page numbers and coordinate offsets to every sentence.
10. **Stage 10 (Script Detection)**: Detects Gujarati (`\u0A80-\u0AFF`), Hindi Devanagari (`\u0900-\u097F`), and English Latin blocks.
11. **Stage 11 (Translation / English Bypass)**: Routes Gujarati/Hindi through IndicTrans2 / deep-translator; executes **explicit English bypass** to preserve exact legal terminology without round-trip loss.
12. **Stage 12 (NLTK Tokenization)**: Splits text into sentence and word units via `sent_tokenize` and `word_tokenize`.
13. **Stage 13 (Government NER)**: Extracts entities across 12 institutional categories with gazetteers and regular expressions.
14. **Stage 14 (Pydantic-Grounded LLM Extraction)**: Extracts structured facts and events conforming to strict Pydantic schemas via Ollama (`llama3`) or deterministic fallback parser.
15. **Stage 15 (Semantic Chunking)**: Segments text into 250-word windows with 50-word overlaps, preserving page provenance.
16. **Stage 16 (Dense Embedding)**: Embeds text chunks into 384-dimensional dense vectors via `all-MiniLM-L6-v2`.
17. **Stage 17 (Vector Indexing)**: Indexes vectors into Qdrant (`evidence_embeddings` collection) with payload metadata.
18. **Stage 18 (Evidence Ledger & Chronology)**: Generates atomic evidence items (`EV-XXXXXXXXXX`) and normalized timeline events.
19. **Stage 19 (Contradiction Analysis)**: Analyzes pairwise evidentiary conflicts (amounts, dates, quantities) and logs candidates for officer review.

---

## Key Platform Capabilities

- **Zero-Fabrication Guarantee**: All extracted facts, events, and briefing claims link verbatim to a source document ID, page number, and bounding box coordinates.
- **Multilingual Support**: First-class handling of **Gujarati (`gu`)**, **Hindi (`hi`)**, and **English (`en`)**. English undergoes an explicit bypass to preserve legal nuance without lossy round-trips.
- **Bundled Multilingual OCR**: High-accuracy Tesseract OCR with bundled language packs (`eng`, `hin`, `guj`, `osd`) located in `backend/tools/tessdata`.
- **12 Institutional NER Classes**:
  1. *Individual / Person* (titles, signatories, witnesses)
  2. *Department / Ministry* (Revenue Dept, CBI, તકેદારી આયોગ, सतर्कता समिति)
  3. *Designation / Title* (Collector, Store In-charge, Inquiry Officer)
  4. *Location / Jurisdiction* (Wards, Districts, Gandhinagar, Nandivan)
  5. *Date* (DD/MM/YYYY, ISO, Indian textual formats)
  6. *Time* (12-hr / 24-hr IST)
  7. *Monetary Amount* (₹, INR, Lakhs, Crores)
  8. *Act / Section* (IPC, CrPC, Disaster Management Act)
  9. *Case / FIR / Reference Number* (FIR No., File No., Work Order Ref)
  10. *Company / Commercial Entity* (Pvt Ltd, LLP, Logistics Suppliers)
  11. *Vehicle Number* (Indian motor vehicle formats, e.g., GJ-01-AB-1234)
  12. *Asset / Commodity* (Water Purification Kits, Emergency Relief stock)
- **Central Evidence Ledger & Event Chronology**: Centralized MongoDB repository maintaining granular evidence items, chronological timeline reconstruction, and entity cross-referencing.
- **Pairwise Contradiction Detection**: Cross-document entity and numerical comparison flagging quantity discrepancies, stock register vs. gate log variances, and date inconsistencies.
- **16-Section Investigation Briefings**: Automated synthesis of formal 16-section briefs, atomic claim extraction, verification workspace, and 3-column review editor.
- **Strict Separation of Duties (Maker-Checker)**: Enforces the administrative rule that authors cannot approve their own briefings (`author != reviewer`).
- **Cryptographic Tamper-Evident Audit Ledger**: SHA-256 chained transaction trail ($H_n = \text{SHA-256}(H_{n-1} \parallel \text{CanonicalPayload}_n)$) with automated mathematical verification and CSV export.
- **Modern Institutional UI & LEKH Design System**: Restrained, accessible government aesthetic (#183153 Navy, #334155 Slate, #0F172A Dark Slate), Plus Jakarta Sans and DM Sans typography, animated landing page with pipeline carousel, and 21 dedicated operational interfaces.

---

## Technology Stack

| Layer | Technologies & Libraries | Purpose |
|---|---|---|
| **Backend API** | Python 3.11+, FastAPI 0.115+, Uvicorn, Pydantic v2, Pydantic-Settings | High-concurrency ASGI REST API with auto-generated OpenAPI documentation |
| **Database** | MongoDB 6.0+ / 7.0+, Motor 3.3+ (Async), PyMongo 4.6+ | Non-blocking transactional store spanning 15 indexed collections |
| **Vector Storage** | Qdrant Client 1.8+, Embedded Persistent Disk (`backend/storage/qdrant`), In-Memory Fallback | Cosine similarity indexing and hybrid semantic evidence retrieval |
| **Object Storage** | MinIO S3 SDK, Local Storage Adapter (`backend/storage/`) | Immutable preservation of original PDFs and intermediate JSON pipeline artifacts |
| **Task Queue & Streaming**| Celery 5.4, RabbitMQ 3.13, AsyncIO Task Runner, SSE (Server-Sent Events) | Asynchronous document processing with live real-time pipeline status streaming |
| **PDF & OCR** | PyMuPDF (`fitz` / `pymupdf`), Tesseract OCR, pytesseract | Digital text parsing with bounding boxes and 300 DPI multilingual OCR |
| **Linguistic NLP & AI** | NLTK 3.8+, IndicTrans2, deep-translator, Sentence-Transformers (`all-MiniLM-L6-v2`), Ollama (`llama3`) | Multilingual translation, institutional NER, semantic chunking, and grounded fact extraction |
| **Document Synthesis** | ReportLab 4.1+, python-docx 1.1+ | Generation of high-fidelity institutional PDF and DOCX briefing documents |
| **Security & Auth** | PyJWT 2.8+, Passlib, Bcrypt 4.0+ | Stateless HS256 JWT bearer authentication and salted password hashing |
| **Frontend Web App** | React 19, Vite 8, React Router v7, TanStack Query v5, Zustand, React Hook Form, Zod | Modern institutional web application with client-side caching and role-based guards |
| **UI Components & Motion**| Lucide React, Motion / Framer Motion (`motion`), Institutional CSS Tokens | Accessible, high-contrast government interface with smooth carousel interactions |
| **Containerization** | Docker, Docker Compose, Nginx Reverse Proxy | Production-ready multi-service container orchestration |

---

## Repository Directory Structure

```text
evidence-linked-file-briefing-assistant/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── admin.py             # User administration, AI readiness, system diagnostics
│   │   │       │   ├── audit.py             # Audit log queries, CSV export, hash-chain verification
│   │   │       │   ├── auth.py              # Login, token issuance, officer profile retrieval
│   │   │       │   ├── briefings.py         # Briefing synthesis, claims verification, approvals, export
│   │   │       │   ├── cases.py             # Case workspaces, officer assignments, case statistics
│   │   │       │   ├── chronology.py        # Event queries, chronological timelines, date filters
│   │   │       │   ├── contradictions.py    # Pairwise contradiction resolution & evidentiary reviews
│   │   │       │   ├── documents.py         # Multipart PDF upload, SHA-256 deduplication, page rendering
│   │   │       │   ├── entities.py          # 12-class government NER queries & entity tracking
│   │   │       │   ├── evidence.py          # Central Evidence Ledger queries & semantic search
│   │   │       │   └── jobs.py              # Pipeline background jobs, SSE live progress streaming
│   │   │       └── router.py                # Aggregated v1 API routing
│   │   ├── core/
│   │   │   ├── config.py                    # Pydantic BaseSettings loading .env and canonical paths
│   │   │   ├── exceptions.py                # Custom error hierarchy and HTTPException handlers
│   │   │   ├── logging.py                   # Structured institutional logging and sanitization
│   │   │   ├── permissions.py              # RBAC role definitions and case jurisdiction dependencies
│   │   │   └── security.py                 # Bcrypt password hashing and JWT encoding/decoding
│   │   ├── db/
│   │   │   ├── indexes.py                   # Automatic index provisioning across 15 MongoDB collections
│   │   │   ├── mongodb.py                   # Async Motor client lifecycle and connection pooling
│   │   │   ├── register_dummy_case.py       # Full seeding script for demonstration case NVD-DR-2026-014
│   │   │   └── seed.py                      # Bootstrap script initializing default institutional user accounts
│   │   ├── integrations/
│   │   │   ├── embedding_provider/          # SentenceTransformers embedder with dense unit-sphere fallback
│   │   │   ├── llm_provider/                # Ollama JSON extractor with deterministic rule-based fallback
│   │   │   ├── ner_provider/                # High-precision 12-class government NER engine
│   │   │   ├── object_storage/              # Dual-mode storage adapter (MinIO S3 / Local filesystem)
│   │   │   ├── ocr_provider/                # Tesseract OCR adapter with PyMuPDF fallback
│   │   │   ├── pdf_parser/                  # Digital PyMuPDF parser extracting text, blocks, and bboxes
│   │   │   ├── translation_provider/        # IndicTrans2 / deep-translator service with English bypass
│   │   │   └── vector_database/             # Qdrant client (remote, persistent embedded disk, in-memory)
│   │   ├── models/                          # Internal domain models
│   │   ├── pipelines/
│   │   │   ├── chunking/                    # Sliding-window document chunker maintaining page provenance
│   │   │   ├── language_detection/          # Unicode script-based language classifier (Guj/Hin/Eng)
│   │   │   ├── nlp/                         # NLTK sentence splitter and lexical tokenizer
│   │   │   ├── normalization/               # Unicode NFKC cleaner and repeating header/footer detector
│   │   │   └── orchestrator.py              # 19-stage pipeline coordinator executing extraction graph
│   │   ├── schemas/                         # Pydantic validation schemas (extractions, claims, briefings)
│   │   ├── services/
│   │   │   ├── audit_service.py             # SHA-256 cryptographic hash-chained audit ledger
│   │   │   ├── briefing_service.py          # 16-section briefing generator & claim extraction engine
│   │   │   └── export_service.py            # ReportLab PDF, python-docx, and CSV generators
│   │   ├── storage/                         # Local storage root (originals, intermediate, embedded Qdrant)
│   │   ├── tools/tessdata/                  # Bundled Tesseract language models (eng, hin, guj, osd)
│   │   ├── workers/                         # Celery application & asynchronous worker tasks
│   │   └── main.py                          # FastAPI application initialization, CORS, and lifecycle events
│   ├── tests/
│   │   ├── api/                             # API endpoint test suite
│   │   ├── integration/                     # Full 24-step end-to-end integration test
│   │   └── unit/                            # Unit tests for audit, auth, NLP, NER, and OCR
│   ├── pyproject.toml                       # Backend packaging configuration
│   └── requirements.txt                     # Pinned Python package dependencies
├── frontend/
│   ├── public/                              # Static public assets (icons, favicon)
│   ├── src/
│   │   ├── app/                             # App entrypoint, router configuration, QueryClient providers
│   │   ├── assets/                          # LEKH institutional branding logos and hero imagery
│   │   ├── components/                      # Common UI components (StatusBadge, DataTable, Modals)
│   │   ├── config/
│   │   │   └── rbac.js                      # Centralized RBAC definition, route guards, action permissions
│   │   ├── features/                        # 21 institutional feature screens grouped by domain:
│   │   │   ├── administration/              # User management, AI services readiness, system health
│   │   │   ├── audit/                       # Tamper-evident audit log ledger & chain verification
│   │   │   ├── auth/                        # Institutional login page with role quick-selector
│   │   │   ├── briefings/                   # Briefings register & 16-section briefing generator
│   │   │   ├── cases/                       # Case register & case detail workspaces
│   │   │   ├── chronology/                  # Chronological timeline view & date filtering
│   │   │   ├── contradictions/              # Pairwise contradiction resolution workspace
│   │   │   ├── dashboard/                   # Institutional operational overview dashboard
│   │   │   ├── documents/                   # Document library & PDF split-pane viewer
│   │   │   ├── entities/                    # 12-class government entity register
│   │   │   ├── evidence/                    # Central Evidence Ledger
│   │   │   ├── intake/                      # Drag-and-drop document intake dropzone
│   │   │   ├── landing/                     # LEKH institutional landing page (Hero, Pipeline, Carousel)
│   │   │   ├── processing/                  # Processing queue & SSE live job monitor
│   │   │   ├── review/                      # 3-column officer briefing review & rich editor
│   │   │   ├── search/                      # Hybrid semantic & lexical evidence search
│   │   │   └── verification/                # Atomic claim verification workspace
│   │   ├── layouts/                         # Main institutional navigation shell, sidebar, and topbar
│   │   ├── services/api/                    # Axios HTTP client with JWT interceptor & auto-refresh
│   │   ├── store/                           # Zustand auth store with role permissions
│   │   ├── styles/                          # Institutional design tokens (tokens.css, layout.css, global.css)
│   │   └── test/                            # Frontend test suites (landing, RBAC, common components)
│   ├── index.html                           # Single-page application entrypoint
│   ├── package.json                         # Frontend dependencies and npm scripts
│   └── vite.config.js                       # Vite build configuration
├── data/samples/                            # 7 demonstration case PDF exhibits (Gujarati, Hindi, English)
├── docs/                                    # Architectural specifications and operator manuals:
│   ├── ARCHITECTURE.md                      # Detailed technical architecture specification
│   ├── API.md                               # Complete OpenAPI / REST endpoint documentation
│   ├── DATABASE.md                          # 15 MongoDB collections, document layouts, indexes
│   ├── AI_PIPELINE.md                       # 19 pipeline stages, IndicTrans2, NER, embeddings
│   ├── ROLES_AND_PERMISSIONS.md             # In-depth RBAC matrix, access rules, and credentials
│   ├── SECURITY.md                          # Security model, separation of duties, hash-chain ledger
│   ├── DEPLOYMENT.md                        # Production Docker Compose & standalone guide
│   └── USER_GUIDE.md                        # Step-by-step operational officer guide
├── dummy_case_pack/                         # Standalone demonstration case pack (NVD-DR-2026-014)
├── infrastructure/                          # Dockerfiles, Nginx configurations, startup scripts
├── audit_pipeline.py                        # Pipeline diagnostic audit script for extraction testing
├── audit_pipeline_results.json              # Diagnostic output from 300 DPI OCR and NER pipeline audit
├── BACKEND_EXPLANATION.md                   # Comprehensive backend architecture and implementation guide
├── docker-compose.yml                       # Multi-container production deployment manifest
├── verify_api.py                            # API validation and non-contamination verification script
├── verify_fix.py                            # Document text normalization and entity verification script
├── .env.example                             # Environment variable template
└── README.md                                # Authoritative project documentation
```

---

## Quick Start Guide

### Option 1: Native Standalone Execution

#### Prerequisites
- **Python 3.11+** installed (`python --version`)
- **Node.js 18+** & **npm** installed (`node --version`)
- **MongoDB 6.0+** running locally on `localhost:27017`
- *(Optional)* Tesseract OCR with `eng`, `hin`, `guj` packages; Ollama for local LLM inference; Qdrant vector database.

#### 1. Setup Backend
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download required NLTK tokenizer models
python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab')"

# Initialize indexes and seed administrative accounts
python app/db/seed.py

# (Optional) Seed the full demonstration case with 7 multilingual exhibits
python app/db/register_dummy_case.py

# Launch FastAPI ASGI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Setup Frontend
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Launch Vite development server
npm run dev
```

The LEKH institutional application is now accessible at `http://localhost:5173`.

---

### Option 2: Docker Compose Deployment

Ensure **Docker Engine** and **Docker Compose v2** are running:

```bash
# Clone and enter project workspace
cd evidence-linked-file-briefing-assistant

# Create environment configuration from template
cp .env.example .env

# Build and start all 7 service containers in background
docker compose up -d --build

# Initialize indexes and seed administrative accounts
docker compose exec backend python app/db/seed.py

# Seed the full demonstration case (NVD-DR-2026-014)
docker compose exec backend python app/db/register_dummy_case.py
```

---

### System Port & Service Map

| Service / Interface | URL / Address | Credentials / Details |
|---|---|---|
| **LEKH Public Portal & Landing** | `http://localhost:5173` (or `http://localhost:80`) | Public presentation & system overview |
| **Officer Secure Login** | `http://localhost:5173/login` | Role-based institutional credentials |
| **FastAPI Interactive Docs (Swagger)**| `http://localhost:8000/api/docs` | OpenAPI documentation & interactive testing |
| **FastAPI ReDoc Specification** | `http://localhost:8000/api/redoc` | Formatted API endpoint specifications |
| **OpenAPI Schema (JSON)** | `http://localhost:8000/api/openapi.json` | Machine-readable API schema |
| **MinIO Storage Console** | `http://localhost:9001` | User: `minioadmin` / Pass: `minioadmin` |
| **RabbitMQ Management Dashboard** | `http://localhost:15672` | User: `guest` / Pass: `guest` |
| **Qdrant Vector DB Dashboard** | `http://localhost:6333/dashboard` | Vector collection monitoring |

---

## Seed Accounts & Role Credentials

The database initialization scripts (`backend/app/db/seed.py` and `backend/app/db/register_dummy_case.py`) provision 5 pre-configured accounts representing the institutional hierarchy:

| Institutional Role | Username | Password | Designated Officer & Title | Primary Operational Scope |
|---|---|---|---|---|
| **Investigating Officer** | `investigator` | `OfficerGov2026!` | Inspector Vikramaditya Mehta *(Chief Investigating Officer)* | Ingest exhibits, analyze evidence, reconcile contradictions, draft 16-section briefings. Cannot self-approve. |
| **Supervisory Reviewer** | `reviewer` | `OfficerGov2026!` | Shri Arvind Swaminathan *(Supervisory Review Commissioner)* | Conduct claim verification, 3-column officer review, officially approve or return briefings. |
| **System Administrator** | `admin` | `AdminSecureGov2026!` | Dr. Rajesh Sharma *(Director of IT & Systems)* | User account administration, AI engine readiness monitoring, system health diagnostics, global case access. |
| **Intake Officer** | `intake_officer` | `OfficerGov2026!` | Smt. Priya Patel *(Central Registry Ingestion Officer)* | Document intake dropzone, SHA-256 duplicate checks, initial intake routing. |
| **Independent Auditor** | `auditor` | `OfficerGov2026!` | Ms. Ananya Sengupta *(Independent Vigilance Auditor)* | Read-only ledger inspection, mathematical SHA-256 audit chain verification, CSV export. |

---

## Pre-Loaded Demonstration Case (NVD-DR-2026-014)

The synthetic demonstration case (`CASE-NVD-DR-2026-014` / `NVD-DR-2026-014`) exercises all multilingual extraction and contradiction capabilities:
- **Title**: *Review of Emergency Water Purification Kit Procurement and Distribution - Monsoon Response 2026*
- **Department**: Nandivan District Relief Office (fictional)
- **Scope**: Reconciling the procurement of 480 emergency water purification kits (INR 600,000) across 7 conflicting evidentiary documents:

| Exhibit ID | Source Filename | Mode | Language | Processing Route | Evidentiary Role |
|---|---|---|---|---|---|
| **DOC-D01** | `D01_Complaint_Gujarati_Scanned.pdf` | Scanned Image | Gujarati | OCR + IndicTrans2 | Public complaint alleging distribution deficit in Wards 3 & 5 |
| **DOC-D02** | `D02_Inspection_Memo_Hindi_Scanned.pdf` | Scanned Image | Hindi | OCR + IndicTrans2 | Vigilance inspection noting missing delivery challan & sample stock |
| **DOC-D03** | `D03_Work_Order_English_Digital.pdf` | Digital Text | English | PyMuPDF + Bypass | Official Work Order for 480 kits at INR 1,250 each |
| **DOC-D04** | `D04_Stock_Register_Gujarati_Scanned.pdf` | Scanned Image | Gujarati | OCR + IndicTrans2 | Central warehouse entry recording receipt of 480 units |
| **DOC-D05** | `D05_Vehicle_Gate_Log_English_Digital.pdf` | Digital Text | English | PyMuPDF + Bypass | Security gate register showing partial delivery (360 unloaded, 120 deferred) |
| **DOC-D06** | `D06_Beneficiary_Statements_Hindi_Scanned.pdf` | Scanned Image | Hindi | OCR + IndicTrans2 | Statements from ward residents indicating partial or delayed receipt |
| **DOC-D07** | `D07_Supplier_Invoice_English_Digital.pdf` | Digital Text | English | PyMuPDF + Bypass | Commercial invoice billing for full contract value of INR 600,000 |

---

## Role-Based Access Control (RBAC) & Feature Matrix

LEKH enforces strict authorization across three tiers:
1. **Frontend Route Guards (`ProtectedRoute`)**: Centralized in [`frontend/src/config/rbac.js`](frontend/src/config/rbac.js).
2. **Backend Dependency Guards (`require_roles`)**: Enforced on every FastAPI endpoint in [`backend/app/api/v1/endpoints/`](backend/app/api/v1/endpoints/).
3. **Case Jurisdiction Boundary (`check_case_access`)**: Restricts operational officers strictly to cases assigned to them, while granting global visibility to Administrators and Auditors.

| Feature / Operation | Route / API | Investigating Officer | Supervisory Reviewer | System Admin | Intake Officer | Independent Auditor |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Operational Dashboard** | `/dashboard` | Assigned | Assigned | All Cases | Assigned | All Cases |
| **Case Register & Creation** | `/cases` | View / Create | View | View / Create | View / Create | View Only |
| **Document Intake & Upload** | `/intake` | Full Access | Blocked | Full Access | Full Access | Blocked |
| **Document Library & Viewer** | `/documents` | Assigned Docs | Assigned Docs | All Docs | Assigned Docs | All Docs |
| **Processing Queue & SSE** | `/processing` | View / Retry | View | Full Control | View | View Only |
| **Evidence Ledger & Search** | `/evidence` | Full Edit | Verify Only | Full Edit | Read-Only | Read-Only |
| **Government Entity Register** | `/entities` | View | View | Full Control | View | View Only |
| **Chronological Timeline** | `/chronology` | Create / Edit | View | Create / Edit | Read-Only | Read-Only |
| **Contradiction Resolution** | `/contradictions` | Review / Justify | Review / Justify | Full Access | Read-Only | Read-Only |
| **Briefings List & Synthesis** | `/briefings` | Draft / Edit | View / Edit | Full Access | Blocked | Read-Only |
| **Claim Verification Workspace**| `/briefings/:id/verify` | Verify Claims | Verify Claims | Verify Claims | Blocked | View Only |
| **Officer Review & Approval** | `/briefings/:id/review` | Edit / Preview | Approve / Return | Approve / Return | Blocked | Read-Only |
| **Separation of Duties (SoD)** | `POST /briefings/:id/approve` | **BLOCKED (403)** | Allowed | Allowed | Blocked | Blocked |
| **Briefing PDF & DOCX Export** | `GET /briefings/:id/export/*` | Allowed | Allowed | Allowed | Blocked | Allowed |
| **Tamper-Evident Audit Ledger**| `/audit` | Blocked (403) | Blocked (403) | Full Access | Blocked (403) | Full Access |
| **Verify Hash Chain Integrity** | `GET /audit/verify-chain` | Blocked (403) | Blocked (403) | Full Access | Blocked (403) | Full Access |
| **Officer User Administration** | `/admin/users` | Blocked | Blocked | Full Access | Blocked | Blocked |
| **AI Readiness Telemetry** | `/admin/ai-services` | Blocked | Blocked | Full Access | Blocked | Blocked |
| **System & Queue Diagnostics** | `/admin/system` | Blocked | Blocked | Full Access | Blocked | Blocked |

---

## 21 Institutional Government Interfaces

The frontend provides 21 dedicated, accessible interfaces grouped by workflow domain:

1. **Public Landing Page** (`/`): Institutional presentation showcasing system capabilities, interactive 19-stage pipeline carousel, and operational workflow.
2. **Officer Authentication** (`/login`): Institutional login with role quick-selector for rapid multi-persona evaluation.
3. **Operational Dashboard** (`/dashboard`): Real-time metrics on cases, ingestion queues, unverified evidence, and active contradictions.
4. **Case Register** (`/cases`): Searchable register of official case files with status filtering and new case creation modal.
5. **Case Workspace Detail** (`/cases/:caseId`): Comprehensive case command center with officer assignment and exhibit breakdown.
6. **Document Intake Dropzone** (`/intake`): Drag-and-drop batch PDF ingestion with instantaneous SHA-256 duplicate warning.
7. **Document Library** (`/documents`): Filterable archive of all ingested exhibits with thumbnail previews and language badges.
8. **Document Split-Pane Viewer** (`/documents/:docId`): Synchronized dual-pane PDF viewer displaying original pages alongside OCR text, normalized text, and bounding boxes.
9. **Processing Queue Monitor** (`/processing`): Live Server-Sent Events (SSE) job pipeline monitor with retry/cancel controls.
10. **Central Evidence Ledger** (`/evidence`): Master table of atomic evidence facts with verification toggles and category filters.
11. **Hybrid Evidence Search** (`/evidence/search`): Semantic vector search powered by Qdrant combined with lexical keyword filtering.
12. **Entity Register** (`/entities`): Master index of 12 institutional entity classes with occurrence frequencies and source citations.
13. **Chronological Timeline** (`/chronology`): Interactive event timeline mapping chronological sequence with date-gap detection.
14. **Contradiction Analysis Workspace** (`/contradictions`): Side-by-side discrepancy resolver with justification recording.
15. **Investigation Briefings Register** (`/briefings`): Archive of synthesized briefings with version tracking and approval statuses.
16. **Briefing Synthesis Generator** (`/briefings/generate`): Parameterized generator drafting structured 16-section briefs.
17. **Factual Claim Verification Workspace** (`/briefings/:briefingId/verify`): Sentence-level claim audit workspace linking assertions to verbatim evidentiary excerpts.
18. **3-Column Officer Review Workspace** (`/briefings/:briefingId/review`): Executive review console with navigation tree, live section editor, and evidence citation inspector.
19. **Tamper-Evident Audit Ledger** (`/audit`): Immutable transaction register with cryptographic integrity check and CSV export.
20. **Officer Account Administration** (`/admin/users`): Administrative user provisioning and role management console.
21. **AI Pipeline Readiness & Health** (`/admin/ai-services` & `/admin/system`): Diagnostic telemetry monitoring OCR, translation, vector databases, and Celery broker queues.

---

## Automated Verification, Testing & Pipeline Auditing

### Backend Test Suite
Run the full unit and API test suites:
```bash
# Run unit tests (Audit, Security, Language, NLP, NER, OCR)
python -m pytest backend/tests/unit -v

# Run API endpoint tests
python -m pytest backend/tests/api -v

# Run full 24-step end-to-end integration workflow
python -m pytest backend/tests/integration/test_full_workflow.py -v
```

### RBAC & Separation of Duties Automated Verification
Execute the automated role verification script testing investigator, reviewer, and administrator boundaries:
```bash
python backend/test_rbac_briefings.py
```
*Validates:*
- Investigator login, briefing retrieval, and section data hydration
- PDF and DOCX export generation
- **Separation of duties**: Verifies HTTP 403 Forbidden when an investigator attempts self-approval
- Draft patch saving and reviewer approval sign-off

### Pipeline Diagnostic Audit (`audit_pipeline.py`)
Run the diagnostic auditing script across sample PDFs in `data/samples`:
```bash
python audit_pipeline.py
```
*Evaluates:*
- **Stage A**: Raw embedded text layer extraction
- **Stage B**: Fresh 300 DPI OCR extraction without destructive binarization
- **Stage C**: Government NER and entity cross-referencing accuracy
- Stores detailed diagnostic outputs in `audit_pipeline_results.json`.

### Frontend Verification Suite
```bash
cd frontend

# Run Vitest component, landing, and RBAC test suites
npm test

# Run Oxlint code quality verification
npm run lint

# Run production build verification
npm run build
```

---

## Documentation Library

Detailed engineering specifications, database schemas, and operator guides are available in the repository documentation directory:

- [System Architecture Specification](docs/ARCHITECTURE.md) &mdash; Authoritative system design and technical architecture.
- [Comprehensive Backend Architecture & Implementation Guide](BACKEND_EXPLANATION.md) &mdash; 650+ line in-depth guide on the 19-stage pipeline, collections, and security.
- [REST API Reference & Payloads](docs/API.md) &mdash; Detailed OpenAPI endpoints, request schemas, and responses.
- [Database Schema & Collections](docs/DATABASE.md) &mdash; 15 MongoDB collections, indexes, and relationship models.
- [AI Pipeline & NER Specification](docs/AI_PIPELINE.md) &mdash; 19 pipeline stages, IndicTrans2 translation, NER rules, and embeddings.
- [Role-Based Access Control & Permissions Guide](docs/ROLES_AND_PERMISSIONS.md) &mdash; Comprehensive RBAC matrix and persona workflows.
- [Security, RBAC & Audit Ledger](docs/SECURITY.md) &mdash; Cryptographic hash-chaining, JWT authentication, and SoD rules.
- [Deployment & Operations Manual](docs/DEPLOYMENT.md) &mdash; Docker Compose, Nginx reverse proxy, and production deployment.
- [Officer Operational User Guide](docs/USER_GUIDE.md) &mdash; Operational walkthrough for investigators, reviewers, and intake officers.
- [Synthetic Demo Case Pack Guide](dummy_case_pack/README.md) &mdash; Specification for demo case `NVD-DR-2026-014`.

---

## Acceptance Criteria & Architecture Compliance

| Architectural Requirement | Implementation Status | Grounding File / Module |
|---|:---:|---|
| **Tier 1: Document Ingestion** | **COMPLIANT** | [`backend/app/api/v1/endpoints/documents.py`](backend/app/api/v1/endpoints/documents.py), SHA-256 deduplication, MinIO S3/Local adapter |
| **Tier 2: Format Extraction** | **COMPLIANT** | [`backend/app/integrations/pdf_parser/parser.py`](backend/app/integrations/pdf_parser/parser.py), [`ocr.py`](backend/app/integrations/ocr_provider/ocr.py) |
| **Tier 3: Normalization & Lang** | **COMPLIANT** | Unicode NFKC cleaner, Gujarati/Hindi/English script detector, IndicTrans2 with English bypass |
| **Tier 4: Government NER & Vectors** | **COMPLIANT** | 12 Government NER classes, Pydantic LLM extractor, Qdrant vector database (remote/embedded) |
| **Tier 5: Evidence Ledger & Intel** | **COMPLIANT** | MongoDB central evidence ledger, Chronology timeline engine, Pairwise contradiction resolver |
| **Tier 6: Briefings & Governance** | **COMPLIANT** | 16-section generator, Claim verification workspace, 3-column review editor, PDF & DOCX export |
| **Separation of Duties (SoD)** | **COMPLIANT** | Maker-checker rule enforced at API (`backend/app/api/v1/endpoints/briefings.py`) and UI |
| **Tamper-Evident Audit Ledger** | **COMPLIANT** | Cryptographic SHA-256 hash-chained ledger (`backend/app/services/audit_service.py`) with verify endpoint |
| **Centralized RBAC Engine** | **COMPLIANT** | 5 institutional roles, route guards in [`frontend/src/config/rbac.js`](frontend/src/config/rbac.js), backend dependencies |
| **21 Government Interfaces** | **COMPLIANT** | All 21 institutional pages fully interactive in [`frontend/src/features/`](frontend/src/features/) |
| **LEKH Institutional Branding** | **COMPLIANT** | Institutional Navy (`#183153`), Slate (`#334155`), DM Sans / Plus Jakarta Sans typography, public landing page |
