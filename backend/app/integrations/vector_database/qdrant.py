import math
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except ImportError:
    QdrantClient = None
    qmodels = None


class QdrantVectorService:
    def __init__(self):
        self.host = settings.QDRANT_HOST
        self.port = settings.QDRANT_PORT
        self.collection = settings.QDRANT_COLLECTION
        self.dim = settings.QDRANT_EMBEDDING_DIM
        self.client: Optional[QdrantClient] = None
        self.is_connected = False

        # In-memory vector store fallback if Qdrant daemon is unreachable
        self._local_points: List[Dict[str, Any]] = []

        self._initialize_client()

    def _initialize_client(self):
        if not QdrantClient:
            logger.warning("qdrant_client library not installed; using local memory vector index.")
            return

        try:
            self.client = QdrantClient(host=self.host, port=self.port, timeout=2.0)
            # Check connection
            self.client.get_collections()
            self.is_connected = True
            self._ensure_collection()
            logger.info(f"Connected to Qdrant vector database at {self.host}:{self.port}")
        except Exception as e:
            self.is_connected = False
            logger.info(f"Qdrant server not responding at {self.host}:{self.port} ({e}). Activated in-memory vector index fallback.")

    def _ensure_collection(self):
        if not self.is_connected or not self.client:
            return
        try:
            collections = [c.name for c in self.client.get_collections().collections]
            if self.collection not in collections:
                self.client.create_collection(
                    collection_name=self.collection,
                    vectors_config=qmodels.VectorParams(
                        size=self.dim,
                        distance=qmodels.Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection: {self.collection}")
        except Exception as e:
            logger.warning(f"Error ensuring Qdrant collection: {e}")

    def upsert_evidence_chunks(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        """Insert or update vector points with payload."""
        if self.is_connected and self.client and qmodels:
            points = []
            for chunk, emb in zip(chunks, embeddings):
                points.append(
                    qmodels.PointStruct(
                        id=chunk["vector_id"],
                        vector=emb,
                        payload={
                            "case_id": chunk.get("case_id"),
                            "document_id": chunk.get("document_id"),
                            "page_start": chunk.get("page_start"),
                            "page_end": chunk.get("page_end"),
                            "text": chunk.get("normalized_text", "")[:1000],
                            "evidence_id": chunk.get("evidence_id", ""),
                        }
                    )
                )
            try:
                self.client.upsert(collection_name=self.collection, points=points)
                return
            except Exception as e:
                logger.warning(f"Failed to upsert to Qdrant ({e}), storing in local fallback.")

        # Local fallback store
        for chunk, emb in zip(chunks, embeddings):
            self._local_points = [p for p in self._local_points if p["id"] != chunk["vector_id"]]
            self._local_points.append({
                "id": chunk["vector_id"],
                "vector": emb,
                "payload": {
                    "case_id": chunk.get("case_id"),
                    "document_id": chunk.get("document_id"),
                    "page_start": chunk.get("page_start"),
                    "page_end": chunk.get("page_end"),
                    "text": chunk.get("normalized_text", "")[:1000],
                    "evidence_id": chunk.get("evidence_id", ""),
                }
            })

    def search_semantic_evidence(
        self,
        query_vector: List[float],
        limit: int = 10,
        case_id: Optional[str] = None,
        document_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for nearest evidence vectors using cosine similarity, filtered by case and document.
        """
        if self.is_connected and self.client and qmodels:
            try:
                filter_conditions = []
                if case_id:
                    filter_conditions.append(
                        qmodels.FieldCondition(key="case_id", match=qmodels.MatchValue(value=case_id))
                    )
                if document_id:
                    filter_conditions.append(
                        qmodels.FieldCondition(key="document_id", match=qmodels.MatchValue(value=document_id))
                    )

                query_filter = qmodels.Filter(must=filter_conditions) if filter_conditions else None

                results = self.client.search(
                    collection_name=self.collection,
                    query_vector=query_vector,
                    limit=limit,
                    query_filter=query_filter,
                )
                return [
                    {
                        "vector_id": str(r.id),
                        "score": round(float(r.score), 4),
                        "payload": r.payload,
                    }
                    for r in results
                ]
            except Exception as e:
                logger.warning(f"Qdrant search error ({e}), running local cosine fallback.")

        # Local in-memory cosine search
        filtered = self._local_points
        if case_id:
            filtered = [p for p in filtered if p["payload"].get("case_id") == case_id]
        if document_id:
            filtered = [p for p in filtered if p["payload"].get("document_id") == document_id]

        scored = []
        for p in filtered:
            score = self._cosine_similarity(query_vector, p["vector"])
            scored.append({
                "vector_id": str(p["id"]),
                "score": round(float(score), 4),
                "payload": p["payload"],
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:limit]

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)

    def health_check(self) -> Dict[str, Any]:
        return {
            "name": "Qdrant Vector Database",
            "host": f"{self.host}:{self.port}",
            "collection": self.collection,
            "connected": self.is_connected,
            "status": "connected" if self.is_connected else "running_local_memory_fallback",
            "indexed_points_count": len(self._local_points) if not self.is_connected else "managed_by_qdrant",
        }


_qdrant_service = QdrantVectorService()


def get_qdrant_service() -> QdrantVectorService:
    return _qdrant_service
