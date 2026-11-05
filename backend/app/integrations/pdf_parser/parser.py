import fitz  # PyMuPDF
import hashlib
from typing import List, Dict, Any, Tuple
from app.core.logging import logger


class PDFParserService:
    @staticmethod
    def calculate_sha256(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    @staticmethod
    def inspect_and_classify_pdf(file_bytes: bytes) -> Tuple[bool, int, str]:
        """
        Inspect PDF. Return:
        (is_valid, page_count, classification: 'digital' or 'scanned')
        """
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = len(doc)
            if page_count == 0:
                doc.close()
                return False, 0, "corrupt_or_empty"

            total_chars = 0
            for page in doc:
                text = page.get_text()
                total_chars += len(text.strip())

            avg_chars = total_chars / page_count
            # If average digital characters per page is below 40, treat as scanned
            classification = "digital" if avg_chars >= 40 else "scanned"
            doc.close()
            return True, page_count, classification
        except Exception as e:
            logger.error(f"Error inspecting PDF: {e}")
            return False, 0, "invalid"

    @staticmethod
    def extract_digital_pages(file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extract digital text, layout metadata, paragraphs and blocks page by page using PyMuPDF.
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages_data = []

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1

            # Extract structured text blocks
            # blocks: (x0, y0, x1, y1, text, block_no, block_type)
            blocks = page.get_text("blocks")
            paragraphs = []
            full_text_parts = []

            for b in blocks:
                # b[6] == 0 for text, 1 for image
                if len(b) >= 5 and (len(b) < 7 or b[6] == 0):
                    text_content = b[4].strip()
                    if text_content:
                        bbox = [round(b[0], 2), round(b[1], 2), round(b[2], 2), round(b[3], 2)]
                        paragraphs.append({
                            "para_index": len(paragraphs) + 1,
                            "text": text_content,
                            "bbox": bbox,
                        })
                        full_text_parts.append(text_content)

            page_text = "\n\n".join(full_text_parts)

            pages_data.append({
                "page_number": page_num,
                "original_text": page_text,
                "ocr_text": "",
                "extraction_method": "digital_pymupdf",
                "ocr_confidence": 100.0,
                "layout_metadata": {
                    "width": page.rect.width,
                    "height": page.rect.height,
                    "blocks_count": len(blocks),
                    "paragraphs": paragraphs,
                },
                "status": "extracted" if page_text else "empty",
            })

        doc.close()
        return pages_data
