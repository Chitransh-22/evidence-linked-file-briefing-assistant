import pytest
from app.schemas.llm_extraction import StructuredExtractionResult, ExtractedFact, ExtractedEventRecord
from app.integrations.llm_provider.llm import get_llm_service
from app.integrations.embedding_provider.embedder import get_embedding_provider
from app.integrations.vector_database.qdrant import get_qdrant_service


@pytest.mark.asyncio
async def test_llm_grounded_extraction_and_schema():
    llm = get_llm_service()
    text = (
        "On 15th October 2023, the Department of Revenue issued an order. "
        "Payment of Rs. 4,50,00,000 was disbursed to Apex Infra Enterprises."
    )
    entities = [
        {"entity_name": "Apex Infra Enterprises", "entity_type": "Organization", "page_number": 1},
        {"entity_name": "15th October 2023", "entity_type": "Date", "page_number": 1},
        {"entity_name": "Rs. 4,50,00,000", "entity_type": "Monetary Amount", "page_number": 1},
    ]

    result = await llm.extract_structured_page_facts("DOC-TEST-001", 1, text, entities)
    assert isinstance(result, StructuredExtractionResult)
    assert len(result.facts) > 0
    assert result.document_id == "DOC-TEST-001"
    assert result.page_number == 1
    # Check that statements match actual text excerpts
    for f in result.facts:
        assert f.exact_source_excerpt in text


def test_embedding_and_vector_search():
    embedder = get_embedding_provider()
    v1 = embedder.generate_embedding("Land acquisition compensation order in Sanand block")
    v2 = embedder.generate_embedding("Revenue parcel payment voucher for industrial corridor")
    assert len(v1) == embedder.dimension
    assert len(v2) == embedder.dimension

    qdrant = get_qdrant_service()
    chunks = [
        {
            "vector_id": "test-vec-001",
            "case_id": "CASE-TEST",
            "document_id": "DOC-TEST",
            "page_start": 1,
            "page_end": 1,
            "normalized_text": "Land acquisition compensation order in Sanand block",
        }
    ]
    qdrant.upsert_evidence_chunks(chunks, [v1])

    results = qdrant.search_semantic_evidence(query_vector=v1, limit=5, case_id="CASE-TEST")
    assert len(results) > 0
    assert results[0]["vector_id"] == "test-vec-001"
    assert results[0]["score"] > 0.8
