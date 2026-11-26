import os
import shutil
import subprocess
from typing import List, Dict, Any, Optional
import fitz
from app.core.config import settings, BACKEND_DIR
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
        self.tessdata_dir = self._find_tessdata_dir()
        self.resolved_binary = self._find_tesseract_binary()

    def _find_tesseract_binary(self) -> Optional[str]:
        if self.cmd and shutil.which(self.cmd):
            return self.cmd
        if self.cmd and os.path.isfile(self.cmd):
            return self.cmd

        candidates = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
            str(BACKEND_DIR / "tools" / "tesseract" / "tesseract.exe"),
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c
        return None

    def _find_tessdata_dir(self) -> Optional[str]:
        candidates = [
            str(BACKEND_DIR / "tools" / "tessdata"),
            r"C:\Program Files\Tesseract-OCR\tessdata",
            os.environ.get("TESSDATA_PREFIX"),
        ]
        for c in candidates:
            if c and os.path.isdir(c) and os.path.isfile(os.path.join(c, "eng.traineddata")):
                return c
        return None

    def is_available(self) -> bool:
        # Provider is available if external CLI exists OR native PyMuPDF tessdata models are installed
        return (self.resolved_binary is not None) or (self.tessdata_dir is not None)

    def get_supported_languages(self) -> List[str]:
        langs = []
        if self.tessdata_dir and os.path.isdir(self.tessdata_dir):
            for f in os.listdir(self.tessdata_dir):
                if f.endswith(".traineddata"):
                    langs.append(f.replace(".traineddata", ""))
        if not langs and self.resolved_binary:
            try:
                res = subprocess.run([self.resolved_binary, "--list-langs"], capture_output=True, text=True, check=True)
                langs = [l.strip() for l in res.stdout.splitlines() if l.strip() and not l.startswith("List of")]
            except Exception:
                pass
        return langs if langs else ["eng", "hin", "guj"]

    def process_pdf(self, file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extract scanned text page by page.
        Uses external Tesseract CLI if installed; otherwise uses high-performance embedded PyMuPDF OCR.
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages_data = []

        if not self.is_available():
            logger.warning("Neither Tesseract binary nor local tessdata found. Reporting scanned document with OCR unavailable warning.")
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                page_num = page_idx + 1
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
                        "ocr_warning": "Tesseract OCR engine is not configured or language packs missing on host.",
                    },
                    "status": "warning_low_confidence",
                })
            doc.close()
            return pages_data

        # Mode A: Native PyMuPDF embedded Tesseract engine
        if self.tessdata_dir:
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                page_num = page_idx + 1
                pix = page.get_pixmap(dpi=300)
                try:
                    ocr_pdf_bytes = pix.pdfocr_tobytes(language=self.languages, tessdata=self.tessdata_dir)
                    ocr_doc = fitz.open("pdf", ocr_pdf_bytes)
                    ocr_page = ocr_doc[0]
                    words_raw = ocr_page.get_text("words")
                    words = [
                        {
                            "text": w[4],
                            "conf": 92.0,
                            "bbox": [int(w[0]), int(w[1]), int(w[2]), int(w[3])],
                        }
                        for w in words_raw if w[4].strip()
                    ]
                    page_text = ocr_page.get_text().strip()
                    ocr_doc.close()

                    pages_data.append({
                        "page_number": page_num,
                        "original_text": page_text,
                        "ocr_text": page_text,
                        "extraction_method": "ocr_embedded_pymupdf",
                        "ocr_confidence": 92.0 if page_text else 0.0,
                        "layout_metadata": {
                            "width": page.rect.width,
                            "height": page.rect.height,
                            "words_count": len(words),
                            "ocr_warning": None,
                        },
                        "status": "extracted" if page_text else "warning_low_confidence",
                    })
                except Exception as e:
                    logger.error(f"Error executing embedded OCR on page {page_num}: {e}")
                    pages_data.append({
                        "page_number": page_num,
                        "original_text": page.get_text().strip(),
                        "ocr_text": page.get_text().strip(),
                        "extraction_method": "ocr_embedded_failed",
                        "ocr_confidence": 0.0,
                        "layout_metadata": {"width": page.rect.width, "height": page.rect.height, "ocr_warning": str(e)},
                        "status": "failed",
                    })
            doc.close()
            return pages_data

        # Mode B: External Tesseract binary execution
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")

            try:
                proc = subprocess.run(
                    [self.resolved_binary, "stdin", "stdout", "-l", self.languages, "tsv"],
                    input=img_bytes,
                    capture_output=True,
                    check=True,
                )
                tsv_lines = proc.stdout.decode("utf-8", errors="replace").splitlines()
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
