import uuid
from typing import List, Dict, Any


class DocumentChunker:
    def __init__(self, target_chunk_tokens: int = 250, overlap_tokens: int = 50):
        self.target_tokens = target_chunk_tokens
        self.overlap = overlap_tokens

    def chunk_document_pages(
        self,
        case_id: str,
        document_id: str,
        pages: List[Dict[str, Any]],
        detected_language: str = "eng"
    ) -> List[Dict[str, Any]]:
        """
        Produce structured chunks with page ranges, source paragraph references,
        and strict document provenance.
        """
        chunks = []
        chunk_idx = 0

        for page in pages:
            page_num = page.get("page_number", 1)
            text = page.get("normalized_text") or page.get("original_text") or ""
            words = text.split()

            if not words:
                continue

            # Slide window across page words
            step = max(1, self.target_tokens - self.overlap)
            for i in range(0, len(words), step):
                chunk_words = words[i:i + self.target_tokens]
                chunk_text = " ".join(chunk_words)

                chunk_id = str(uuid.uuid4())
                chunk_idx += 1

                chunks.append({
                    "_id": chunk_id,
                    "chunk_id": chunk_id,
                    "case_id": case_id,
                    "document_id": document_id,
                    "chunk_index": chunk_idx,
                    "page_start": page_num,
                    "page_end": page_num,
                    "source_paragraphs": [1],
                    "original_text": chunk_text,
                    "normalized_text": chunk_text,
                    "language": detected_language,
                    "token_count": len(chunk_words),
                    "vector_id": chunk_id,
                })

        return chunks
