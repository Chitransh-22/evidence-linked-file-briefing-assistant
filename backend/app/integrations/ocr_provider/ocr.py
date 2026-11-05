import shutil
import subprocess
from typing import List, Dict, Any, Optional
import fitz
from app.core.config import settings
from app.core.logging import logger


class BaseOCRProvider:
    def is_available(self) -> bool:
        raise NotImplementedError

    def process_pdf(self, file_bytes: bytes) -> List[Dict[str, Any]]:
        raise NotImplementedError


class TesseractOCRProvider(BaseOCRProvider):
    def __init__(self):
        self.cmd = settings.TESSERACT_CMD
        self.languages = settings.TESSERACT_LANGUAGES
        self.threshold = settings.OCR_CONFIDENCE_THRESHOLD

    def is_available(self) -> bool:
        return shutil.which(self.cmd) is not None

    def get_supported_languages(self) -> List[str]:
        if not self.is_available():
            return []
        try:
            res = subprocess.run([self.cmd, "--list-langs"], capture_output=True, text=True, check=True)
            langs = [l.strip() for l in res.stdout.splitlines() if l.strip() and not l.startswith("List of")]
            return langs
        except Exception:
            return ["eng"]

    def process_pdf(self, file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extract scanned text page by page.
        If Tesseract is not installed on the host, gracefully report low confidence / unavailable warning.
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages_data = []

        if not self.is_available():
            logger.warning("Tesseract binary not found in PATH. Reporting scanned document with OCR unavailable warning.")
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                page_num = page_idx + 1
                # Try fallback PyMuPDF text if any
                fallback_text = page.get_text().strip()
                pages_data.append({
                    "page_number": page_num,
                    "original_text": fallback_text,
                    "ocr_text": fallback_text,
                    "extraction_method": "ocr_tesseract_unavailable",
                    "ocr_confidence": 0.0,
                    "layout_metadata": {
                        "width": page.rect.width,
                        "height": page.rect.height,
                        "ocr_warning": "Tesseract OCR engine is not configured or language packs (eng, hin, guj) missing on host.",
                    },
                    "status": "warning_low_confidence",
                })
            doc.close()
            return pages_data

        # If Tesseract is available, render page pixmap and run tesseract
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")

            try:
                # Run tesseract with tsv output to get confidence and bounding boxes
                proc = subprocess.run(
                    [self.cmd, "stdin", "stdout", "-l", self.languages, "tsv"],
                    input=img_bytes,
                    capture_output=True,
                    check=True,
                )
                tsv_lines = proc.stdout.decode("utf-8", errors="replace").splitlines()
                # Parse TSV
                words = []
                confidences = []
                for line in tsv_lines[1:]:
                    parts = line.split("\t")
                    if len(parts) >= 12:
                        conf = float(parts[10]) if parts[10].strip() and parts[10] != "-1" else 0.0
                        text = parts[11].strip()
                        if text:
                            confidences.append(conf)
                            words.append({
                                "text": text,
                                "conf": conf,
                                "bbox": [int(parts[6]), int(parts[7]), int(parts[6]) + int(parts[8]), int(parts[7]) + int(parts[9])],
                            })

                page_text = " ".join([w["text"] for w in words])
                avg_conf = (sum(confidences) / len(confidences)) if confidences else 0.0
                status = "extracted" if avg_conf >= self.threshold else "warning_low_confidence"

                pages_data.append({
                    "page_number": page_num,
                    "original_text": page_text,
                    "ocr_text": page_text,
                    "extraction_method": "ocr_tesseract",
                    "ocr_confidence": round(avg_conf, 2),
                    "layout_metadata": {
                        "width": page.rect.width,
                        "height": page.rect.height,
                        "words_count": len(words),
                        "ocr_warning": "Low OCR confidence; human verification required." if avg_conf < self.threshold else None,
                    },
                    "status": status,
                })
            except Exception as e:
                logger.error(f"Error executing Tesseract on page {page_num}: {e}")
                pages_data.append({
                    "page_number": page_num,
                    "original_text": "",
                    "ocr_text": "",
                    "extraction_method": "ocr_tesseract_failed",
                    "ocr_confidence": 0.0,
                    "layout_metadata": {
                        "width": page.rect.width,
                        "height": page.rect.height,
                        "ocr_warning": f"OCR processing failed on page {page_num}: {str(e)}",
                    },
                    "status": "failed",
                })

        doc.close()
        return pages_data


_ocr_provider = TesseractOCRProvider()


def get_ocr_provider() -> BaseOCRProvider:
    return _ocr_provider
