import re
import unicodedata
from typing import List, Dict, Any


class DocumentNormalizer:
    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Normalize text preserving semantic content:
        - Unicode normalization (NFKC)
        - Whitespace cleanup
        - Artifact removal
        """
        if not text:
            return ""
        # Unicode normalization
        text = unicodedata.normalize("NFKC", text)
        # Remove non-printable control characters except standard whitespace
        text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)
        # Normalize multiple spaces and tabs to single space
        text = re.sub(r"[ \t]+", " ", text)
        # Normalize excessive newlines (max 2 consecutive)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @staticmethod
    def detect_repeated_headers_footers(pages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Identify repeated headers and footers across pages to avoid noisy duplication in downstream NLP.
        """
        if len(pages) < 2:
            return {"headers": [], "footers": []}

        first_lines = []
        last_lines = []
        for p in pages:
            lines = [l.strip() for l in p.get("original_text", "").splitlines() if l.strip()]
            if lines:
                first_lines.append(lines[0])
                last_lines.append(lines[-1])

        repeated_headers = [line for line in set(first_lines) if first_lines.count(line) > (len(pages) * 0.5)]
        repeated_footers = [line for line in set(last_lines) if last_lines.count(line) > (len(pages) * 0.5)]

        return {
            "headers": repeated_headers,
            "footers": repeated_footers
        }
