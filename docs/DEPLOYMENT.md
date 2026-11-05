# Government Document Evidence Intelligence & Briefing Management System
## Deployment & Operations Manual

---

### Table of Contents
1. [Deployment Architectures](#1-deployment-architectures)
2. [Prerequisites & System Requirements](#2-prerequisites--system-requirements)
3. [Configuration & Environment Variables](#3-configuration--environment-variables)
4. [Deployment Option A: Docker Compose (Full Stack)](#4-deployment-option-a-docker-compose-full-stack)
5. [Deployment Option B: Local Standalone Development Mode](#5-deployment-option-b-local-standalone-development-mode)
6. [Nginx Reverse Proxy & TLS Configuration](#6-nginx-reverse-proxy--tls-configuration)
7. [Health Checks & Monitoring](#7-health-checks--monitoring)
8. [Database Backup & Disaster Recovery](#8-database-backup--disaster-recovery)

---

### 1. Deployment Architectures

The platform can be operated in two modes:

1. **Containerized Production Stack (Docker Compose)**:
   - Orchestrates 7 container services: MongoDB, RabbitMQ, MinIO (S3-compatible Object Storage), Qdrant (Vector Database), FastAPI Backend, Celery Background Worker, and Vite/Nginx Frontend.
2. **Local Standalone Mode (Native Host Execution)**:
   - Runs FastAPI and Vite directly on the host machine.
   - Leverages built-in fallbacks (Local Object Storage adapter and Local Dense Vector similarity search) if MinIO or Qdrant daemons are not running locally.

---

### 2. Prerequisites & System Requirements

#### Minimum Hardware Requirements
- **CPU**: 4 Cores (8 Cores recommended for local OCR/Translation)
- **RAM**: 16 GB (32 GB recommended for running IndicTrans2 and local LLM)
- **Storage**: 100 GB SSD (High-throughput I/O for document storage and OCR cache)

#### Software Dependencies
- **Docker**: Engine 24.0+ and Docker Compose v2.20+ (for container deployment)
- **Python**: 3.11+
- **Node.js**: v20+ or v22+ with `npm`
- **Tesseract OCR**: 5.x with `guj`, `hin`, and `eng` traineddata files (for scanned document processing)

---

### 3. Configuration & Environment Variables

Create `.env` in the root workspace based on `.env.example`:

```bash
# Server & Environment
PROJECT_NAME="Government Document Evidence Intelligence & Briefing Management System"
ENVIRONMENT="production"
SECRET_KEY="replace_with_a_cryptographically_secure_256_bit_random_hex_key"
API_V1_STR="/api/v1"
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database (MongoDB)
MONGODB_URI="mongodb://admin:SuperSecureMongo2026!@mongodb:27017"
MONGODB_DB_NAME="evidence_intelligence_gov"

# Object Storage (MinIO / S3)
STORAGE_BACKEND="minio" # minio or local
S3_ENDPOINT="http://minio:9000"
S3_ACCESS_KEY="minio_admin"
S3_SECRET_KEY="MinioSecureGov2026!"
S3_BUCKET_NAME="gov-evidence-store"
S3_SECURE=false

# Vector Database (Qdrant)
QDRANT_HOST="qdrant"
QDRANT_PORT=6333
QDRANT_COLLECTION="evidence_vectors"

# Message Queue & Celery (RabbitMQ)
RABBITMQ_URI="amqp://guest:guest@rabbitmq:5672//"
CELERY_BROKER_URL="amqp://guest:guest@rabbitmq:5672//"
CELERY_RESULT_BACKEND="rpc://"

# AI & LLM Services
LLM_PROVIDER="ollama" # ollama, openai, or mock
OLLAMA_BASE_URL="http://host.docker.internal:11434"
LLM_MODEL_NAME="llama3.1:8b"
EMBEDDING_MODEL_NAME="sentence-transformers/all-MiniLM-L6-v2"
TESSERACT_CMD="/usr/bin/tesseract"
INDICTRANS2_MODEL_PATH=""
```

---

### 4. Deployment Option A: Docker Compose (Full Stack)

To build and start all containers in the background:

```bash
# 1. Clone repository and navigate to root directory
cd SFIC

# 2. Prepare environment configuration
cp .env.example .env
# Edit .env with production passwords

# 3. Launch the container cluster
docker compose up -d --build

# 4. Initialize database indexes and seed default administrative accounts
docker compose exec backend python app/db/seed.py

# 5. Verify container health
docker compose ps
```

The system will be accessible at:
- **Frontend Portal**: `http://localhost` (Port 80)
- **API Swagger Documentation**: `http://localhost/docs` or `http://localhost:8000/docs`
- **MinIO Object Console**: `http://localhost:9001`
- **RabbitMQ Management Dashboard**: `http://localhost:15672`
- **Qdrant Vector Dashboard**: `http://localhost:6333/dashboard`

---

### 5. Deployment Option B: Local Standalone Development Mode

When developing without Docker:

```bash
# Terminal 1 — Backend API
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app/db/seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Background Celery Worker (Optional, if RabbitMQ is running)
cd backend
celery -A app.workers.celery_app worker --loglevel=info -P solo

# Terminal 3 — Frontend Development Server
cd frontend
npm install
npm run dev
```

The development server runs at `http://localhost:5173`.

---

### 6. Nginx Reverse Proxy & TLS Configuration

In production, terminate TLS at Nginx using institutional certificates. The reverse proxy configuration is located at `infrastructure/nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name evidence.gov.in;

    ssl_certificate /etc/ssl/certs/gov_evidence.crt;
    ssl_certificate_key /etc/ssl/private/gov_evidence.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 100M;

    # Frontend Assets
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Routing
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Server-Sent Events (SSE) Live Job Tracking
    location /api/v1/jobs/ {
        proxy_pass http://backend:8000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }
}
```

---

### 7. Health Checks & Monitoring

- **Application Health**: `GET /api/v1/admin/system/metrics`
- **AI Services Health**: `GET /api/v1/admin/ai-services/health`
  - Validates OCR binaries, IndicTrans2 readiness, vector database accessibility, and LLM responsiveness.
- **Audit Cryptographic Integrity**: `POST /api/v1/audit/verify-integrity`
  - Validates the unbroken state of the SHA-256 chained audit trail.

---

### 8. Database Backup & Disaster Recovery

#### Automated Daily MongoDB Backup
```bash
# Dump the evidence intelligence database
mongodump --uri="mongodb://admin:SuperSecureMongo2026!@localhost:27017" --db=evidence_intelligence_gov --out=/backup/mongo_$(date +%Y%m%d)

# Backup MinIO object store volume
tar -czvf /backup/minio_data_$(date +%Y%m%d).tar.gz /var/lib/minio/data
```

#### Restoration Procedure
```bash
# Restore MongoDB collection data
mongorestore --uri="mongodb://admin:SuperSecureMongo2026!@localhost:27017" --drop /backup/mongo_20260305/evidence_intelligence_gov

# Run verification check immediately following restoration
curl -X POST http://localhost:8000/api/v1/audit/verify-integrity -H "Authorization: Bearer <auditor_token>"
```
