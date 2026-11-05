import fitz
import pytest
from app.integrations.pdf_parser.parser import PDFParserService
from app.integrations.ocr_provider.ocr import get_ocr_provider


def create_synthetic_pdf(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_pdf_sha256_calculation():
    sample_bytes = b"%PDF-1.4 synthetic content"
    checksum = PDFParserService.calculate_sha256(sample_bytes)
    assert len(checksum) == 64


def test_digital_pdf_inspection_and_extraction():
    sample_text = (
        "GOVERNMENT OF GUJARAT - REVENUE DEPARTMENT\n"
        "Official Memorandum Ref No: REV/2023/8892\n"
        "Regarding Land Acquisition Survey Parcel 412/A, Sanand Block.\n"
        "Total compensation sanctioned: Rs. 4,50,00,000 on 15th October 2023."
    )
    pdf_bytes = create_synthetic_pdf(sample_text)

    is_valid, page_count, classification = PDFParserService.inspect_and_classify_pdf(pdf_bytes)
    assert is_valid is True
    assert page_count == 1
    assert classification == "digital"

    pages_data = PDFParserService.extract_digital_pages(pdf_bytes)
    assert len(pages_data) == 1
    assert "Sanand Block" in pages_data[0]["original_text"]
    assert pages_data[0]["page_number"] == 1
    assert pages_data[0]["extraction_method"] == "digital_pymupdf"


def test_ocr_provider_interface():
    ocr = get_ocr_provider()
    # Check that availability can be queried without exception
    available = ocr.is_available()
    assert isinstance(available, bool)
