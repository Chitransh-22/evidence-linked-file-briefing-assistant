# Government Document Evidence Intelligence & Briefing Management System
## Authoritative System Architecture Specification

### 1. Architectural Overview
The platform is organized into six authoritative sequential architectural stages, transforming unstructured and semi-structured multilingual documents into traceable, verifiable evidence records and briefings.

```mermaid
flowchart TD
    subgraph S1["STAGE 1 — Intake & Routing"]
        Upload["PDF Upload (Single/Multi)"] --> IngestAPI["Ingestion API & Checksum"]
        IngestAPI --> Classify["Document Classification"]
        IngestAPI --> OrigStore["Original Document Storage"]
        IngestAPI --> MongoMeta["MongoDB Document Metadata"]
    end

    subgraph S2["STAGE 2 — Format-Specific Extraction"]
        Classify -->|Digital| PyMuPDF["PyMuPDF Layout Parser"]
        Classify -->|Scanned| Tesseract["Tesseract OCR (Eng/Hin/Guj)"]
        PyMuPDF --> CommonExtract["Extraction API"]
        Tesseract --> CommonExtract
        CommonExtract --> InterStore["Intermediate Object Storage"]
        CommonExtract --> Queue["RabbitMQ / Celery Queue"]
    end

    subgraph S3["STAGE 3 — Normalization & Language Processing"]
        Queue --> Norm["Feature Normalization"]
        Norm --> Struct["Layout & Document Structure"]
        Struct --> LangDet["Language Detection (Guj/Hin/Eng)"]
        LangDet --> Routing{"Language Routing"}
        Routing -->|Gujarati / Hindi| IndicTrans["IndicTrans2 Translation"]
        Routing -->|English| Bypass["English Bypass"]
        IndicTrans --> NLTK["NLTK Preprocessing"]
        Bypass --> NLTK
    end

    subgraph S4["STAGE 4 — Parallel AI Extraction & Indexing"]
        NLTK --> NER["Government Named Entity Recognition"]
        NLTK --> LLM["Structured LLM Grounded Extraction"]
        NLTK --> Chunker["Contextual Document Chunking"]
        Chunker --> Embed["Dense Sentence Embeddings"]
        Embed --> Qdrant["Qdrant Vector Database"]
    end

    subgraph S5["STAGE 5 — Evidence Ledger & Intelligence Services"]
        NER --> Ledger["MongoDB Evidence Ledger"]
        LLM --> Ledger
        Ledger --> Chronology["Event & Chronology Engine"]
        Ledger --> Contradiction["Contradiction Detection"]
        Qdrant -.-> Retrieve["Semantic Evidence Retrieval"]
        Ledger -.-> Retrieve
    end

    subgraph S6["STAGE 6 — Briefing Synthesis & Officer Review"]
        Retrieve --> BriefingGen["AI-Assisted Briefing Generator"]
        Chronology --> BriefingGen
        Contradiction --> BriefingGen
        BriefingGen --> ClaimVerify["Independent Claim Verification"]
        ClaimVerify --> OfficerReview["Officer Review & Rich Editing"]
        OfficerReview --> FinalApproval["Supervisory Approval (Separation of Duties)"]
        FinalApproval --> Exports["PDF & DOCX Official Publications"]
        FinalApproval --> Audit["Tamper-Evident SHA-256 Audit Chain"]
    end
```

### 2. The Six Architectural Stages
1. **Document Intake and Routing**: File validation, SHA-256 calculation, duplicate detection, immutable original file persistence, and metadata initialization.
2. **Format-Specific Extraction and Job Dispatch**: Digital parsing via PyMuPDF; scanned document processing via Tesseract with Hindi and Gujarati packs; asynchronous Celery job dispatch.
3. **Document Normalization, Structure and Language Processing**: Unicode NFKC normalization, layout reconstruction, segment-level language detection, IndicTrans2 translation for Gujarati/Hindi, explicit English bypass, and NLTK preprocessing.
4. **AI-Powered Evidence Extraction and Indexing**: NER across 12 government-specific entity classes, structured LLM extraction conforming to Pydantic schemas, chunking, and Qdrant vector indexing.
5. **MongoDB Evidence Ledger & Intelligence Services**: Centralized structured evidence register, timeline chronological engine, pairwise contradiction detection, and hybrid vector/metadata evidence retrieval.
6. **Briefing Generation, Claim Verification & Officer Review**: 16-section briefing synthesis, atomic claim verification, 3-column officer editing workspace, supervisory sign-off enforcing separation of duties, and tamper-evident SHA-256 audit chaining.
