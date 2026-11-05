import math
import hashlib
from typing import List, Dict, Any
from app.core.config import settings
from app.core.logging import logger

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None


class EmbeddingProvider:
    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL_NAME
        self.dimension = settings.QDRANT_EMBEDDING_DIM
        self._model = None

    def get_service_status(self) -> Dict[str, Any]:
        has_lib = SentenceTransformer is not None
        return {
            "name": "Vector Embedding Provider",
            "model_name": self.model_name,
            "dimension": self.dimension,
            "provider": "sentence-transformers" if has_lib else "deterministic_dense_vectorizer",
            "status": "ready",
            "library_installed": has_lib,
        }

    def generate_embedding(self, text: str) -> List[float]:
        """Generate a dense vector of specified dimension."""
        if not text:
            return [0.0] * self.dimension

        if SentenceTransformer and self._model is None:
            try:
                logger.info(f"Loading local SentenceTransformer model: {self.model_name}...")
                self._model = SentenceTransformer(self.model_name)
            except Exception as e:
                logger.warning(f"Could not load SentenceTransformer ({e}). Falling back to deterministic dense vectorizer.")
                self._model = False

        if self._model:
            try:
                emb = self._model.encode(text, normalize_embeddings=True)
                return emb.tolist()
            except Exception as e:
                logger.warning(f"Embedding encoding error ({e}), using dense projection.")

        # Deterministic semantic hash projection into unit sphere
        return self._deterministic_dense_projection(text, self.dimension)

    def _deterministic_dense_projection(self, text: str, dim: int) -> List[float]:
        tokens = text.lower().split()
        vector = [0.0] * dim
        for token in tokens:
            # Deterministic bucket mapping
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if (h // dim) % 2 == 0 else -1.0
            vector[idx] += sign

        # Normalize to unit length (L2 norm)
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0:
            vector = [round(v / norm, 6) for v in vector]
        return vector


_embedder = EmbeddingProvider()


def get_embedding_provider() -> EmbeddingProvider:
    return _embedder
