import os
import io
from abc import ABC, abstractmethod
from typing import Optional
from app.core.config import settings, REPO_ROOT, BACKEND_DIR
from app.core.logging import logger

try:
    from minio import Minio
except ImportError:
    Minio = None


class BaseStorageAdapter(ABC):
    @abstractmethod
    def save_original(self, doc_id: str, file_bytes: bytes, filename: str) -> str:
        """Store original uploaded document and return unique storage key."""
        pass

    @abstractmethod
    def get_original(self, storage_key: str) -> bytes:
        """Retrieve original document bytes."""
        pass

    @abstractmethod
    def save_intermediate(self, doc_id: str, artifact_name: str, data: bytes) -> str:
        """Store intermediate pipeline artifact."""
        pass

    @abstractmethod
    def get_intermediate(self, storage_key: str) -> bytes:
        """Retrieve intermediate pipeline artifact."""
        pass

    @abstractmethod
    def health_check(self) -> dict:
        """Check connection health."""
        pass

    @abstractmethod
    def delete_document_files(self, doc_id: str, storage_key: Optional[str] = None):
        """Delete all original and intermediate files associated with a document."""
        pass


class LocalStorageAdapter(BaseStorageAdapter):
    def __init__(self, base_path: str = "./storage"):
        # Anchor storage canonically to backend/storage
        if not os.path.isabs(base_path):
            backend_storage = os.path.abspath(os.path.join(BACKEND_DIR, "storage"))
            cwd_storage = os.path.abspath(base_path)
            # Prefer backend/storage
            if os.path.exists(backend_storage):
                self.base_path = backend_storage
            elif os.path.exists(cwd_storage):
                self.base_path = cwd_storage
            else:
                self.base_path = backend_storage
        else:
            self.base_path = os.path.abspath(base_path)

        self.originals_dir = os.path.join(self.base_path, "originals")
        self.intermediate_dir = os.path.join(self.base_path, "intermediate")
        os.makedirs(self.originals_dir, exist_ok=True)
        os.makedirs(self.intermediate_dir, exist_ok=True)

    def save_original(self, doc_id: str, file_bytes: bytes, filename: str) -> str:
        safe_name = f"{doc_id}_{os.path.basename(filename)}"
        target_path = os.path.join(self.originals_dir, safe_name)
        with open(target_path, "wb") as f:
            f.write(file_bytes)
        return safe_name

    def get_original(self, storage_key: str) -> bytes:
        filename = os.path.basename(storage_key)
        target_path = os.path.join(self.originals_dir, filename)
        if not os.path.exists(target_path):
            # Fallback search across canonical candidates for cross-environment robustness
            candidates = [
                os.path.join(str(BACKEND_DIR), "storage", "originals", filename),
                os.path.join(os.getcwd(), "storage", "originals", filename),
                os.path.join(os.getcwd(), "backend", "storage", "originals", filename),
                os.path.join(str(REPO_ROOT), "storage", "originals", filename),
            ]
            for candidate in candidates:
                if os.path.exists(candidate):
                    target_path = candidate
                    break
            else:
                raise FileNotFoundError(f"Original file not found: {storage_key}")
        with open(target_path, "rb") as f:
            return f.read()

    def save_intermediate(self, doc_id: str, artifact_name: str, data: bytes) -> str:
        safe_name = f"{doc_id}_{os.path.basename(artifact_name)}"
        target_path = os.path.join(self.intermediate_dir, safe_name)
        with open(target_path, "wb") as f:
            f.write(data)
        return safe_name

    def get_intermediate(self, storage_key: str) -> bytes:
        filename = os.path.basename(storage_key)
        target_path = os.path.join(self.intermediate_dir, filename)
        if not os.path.exists(target_path):
            candidates = [
                os.path.join(str(BACKEND_DIR), "storage", "intermediate", filename),
                os.path.join(os.getcwd(), "storage", "intermediate", filename),
                os.path.join(os.getcwd(), "backend", "storage", "intermediate", filename),
                os.path.join(str(REPO_ROOT), "storage", "intermediate", filename),
            ]
            for candidate in candidates:
                if os.path.exists(candidate):
                    target_path = candidate
                    break
            else:
                raise FileNotFoundError(f"Intermediate file not found: {storage_key}")
        with open(target_path, "rb") as f:
            return f.read()

    def health_check(self) -> dict:
        writable = os.access(self.originals_dir, os.W_OK) and os.access(self.intermediate_dir, os.W_OK)
        return {
            "status": "healthy" if writable else "degraded",
            "provider": "local_filesystem",
            "path": os.path.abspath(self.base_path),
            "accessible": writable,
        }

    def delete_document_files(self, doc_id: str, storage_key: Optional[str] = None):
        """Purge all storage artifacts for a document."""
        if storage_key:
            target = os.path.join(self.originals_dir, os.path.basename(storage_key))
            if os.path.exists(target):
                try:
                    os.remove(target)
                except Exception as e:
                    logger.warning(f"Error deleting original {target}: {e}")
        if os.path.exists(self.originals_dir):
            for fname in os.listdir(self.originals_dir):
                if fname.startswith(f"{doc_id}_") or fname == doc_id:
                    try:
                        os.remove(os.path.join(self.originals_dir, fname))
                    except Exception as e:
                        logger.warning(f"Error deleting {fname}: {e}")
        if os.path.exists(self.intermediate_dir):
            for fname in os.listdir(self.intermediate_dir):
                if fname.startswith(f"{doc_id}_") or fname == doc_id:
                    try:
                        os.remove(os.path.join(self.intermediate_dir, fname))
                    except Exception as e:
                        logger.warning(f"Error deleting intermediate {fname}: {e}")


class MinioStorageAdapter(BaseStorageAdapter):
    def __init__(self):
        if not Minio:
            raise ImportError("Minio package not installed")
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self.bucket_orig = settings.MINIO_BUCKET_ORIGINALS
        self.bucket_inter = settings.MINIO_BUCKET_INTERMEDIATE
        self._ensure_buckets()

    def _ensure_buckets(self):
        try:
            if not self.client.bucket_exists(self.bucket_orig):
                self.client.make_bucket(self.bucket_orig)
            if not self.client.bucket_exists(self.bucket_inter):
                self.client.make_bucket(self.bucket_inter)
        except Exception as e:
            logger.warning(f"Could not initialize MinIO buckets: {e}")

    def save_original(self, doc_id: str, file_bytes: bytes, filename: str) -> str:
        object_name = f"{doc_id}/{os.path.basename(filename)}"
        self.client.put_object(
            self.bucket_orig,
            object_name,
            io.BytesIO(file_bytes),
            length=len(file_bytes),
            content_type="application/pdf",
        )
        return object_name

    def get_original(self, storage_key: str) -> bytes:
        response = self.client.get_object(self.bucket_orig, storage_key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def save_intermediate(self, doc_id: str, artifact_name: str, data: bytes) -> str:
        object_name = f"{doc_id}/{artifact_name}"
        self.client.put_object(
            self.bucket_inter,
            object_name,
            io.BytesIO(data),
            length=len(data),
            content_type="application/octet-stream",
        )
        return object_name

    def get_intermediate(self, storage_key: str) -> bytes:
        response = self.client.get_object(self.bucket_inter, storage_key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def health_check(self) -> dict:
        try:
            exists = self.client.bucket_exists(self.bucket_orig)
            return {
                "status": "healthy" if exists else "degraded",
                "provider": "minio_s3",
                "endpoint": settings.MINIO_ENDPOINT,
                "accessible": True,
            }
        except Exception as e:
            return {
                "status": "unavailable",
                "provider": "minio_s3",
                "endpoint": settings.MINIO_ENDPOINT,
                "error": str(e),
                "accessible": False,
            }

    def delete_document_files(self, doc_id: str, storage_key: Optional[str] = None):
        """Purge all storage artifacts for a document in MinIO."""
        try:
            for bucket in [self.bucket_orig, self.bucket_inter]:
                if self.client.bucket_exists(bucket):
                    objects = self.client.list_objects(bucket, prefix=f"{doc_id}/", recursive=True)
                    for obj in objects:
                        self.client.remove_object(bucket, obj.object_name)
                    if storage_key:
                        try:
                            self.client.remove_object(bucket, storage_key)
                        except Exception:
                            pass
        except Exception as e:
            logger.warning(f"Error deleting MinIO files for {doc_id}: {e}")


_storage_adapter: Optional[BaseStorageAdapter] = None


def get_storage_adapter() -> BaseStorageAdapter:
    global _storage_adapter
    if _storage_adapter is None:
        if settings.STORAGE_PROVIDER in ["minio", "s3"]:
            try:
                _storage_adapter = MinioStorageAdapter()
                logger.info("Initialized MinIO S3 object storage adapter")
            except Exception as e:
                logger.warning(f"MinIO storage unavailable ({e}), falling back to local filesystem adapter")
                _storage_adapter = LocalStorageAdapter(settings.LOCAL_STORAGE_PATH)
        else:
            _storage_adapter = LocalStorageAdapter(settings.LOCAL_STORAGE_PATH)
            logger.info("Initialized Local Filesystem storage adapter")
    return _storage_adapter
