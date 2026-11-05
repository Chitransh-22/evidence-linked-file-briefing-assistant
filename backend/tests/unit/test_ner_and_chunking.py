import pytest
from app.integrations.ner_provider.ner import get_ner_service
from app.pipelines.chunking.chunker import DocumentChunker


def test_government_ner_extraction():
    ner = get_ner_service()
    text = (
        "On 15th October 2023, Shri Hiren Joshi of District Collectorate approved "
        "a disbursement of Rs. 4,50,00,000 to Apex Infra Enterprises under F.No. REV/2023/8892. "
        "The inspection vehicle was GJ01AB1234."
    )
    entities = ner.extract_entities(text, document_id="DOC-TEST-001", page_number=1, para_number=1)

    categories = [e["entity_type"] for e in entities]
    assert "Date" in categories
    assert "Monetary Amount" in categories
    assert "Person" in categories
    assert "Government Department" in categories
    assert "Organization" in categories
    assert "Reference Number" in categories
    assert "Vehicle Identifier" in categories


def test_document_chunker():
    chunker = DocumentChunker(target_chunk_tokens=20, overlap_tokens=5)
    pages = [
        {
            "page_number": 1,
            "normalized_text": "This is page one text containing multiple words designed to test the chunking system boundaries."
        },
        {
            "page_number": 2,
            "normalized_text": "This is page two text with more content for verification."
        }
    ]
    chunks = chunker.chunk_document_pages(case_id="CASE-01", document_id="DOC-01", pages=pages)
    assert len(chunks) >= 2
    for c in chunks:
        assert c["case_id"] == "CASE-01"
        assert c["document_id"] == "DOC-01"
        assert "page_start" in c
        assert "token_count" in c
