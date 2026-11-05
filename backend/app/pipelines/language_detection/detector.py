import re
from typing import Dict, Any, Tuple


class LanguageDetector:
    # Unicode blocks
    GUJARATI_PATTERN = re.compile(r"[\u0A80-\u0AFF]")
    DEVANAGARI_HINDI_PATTERN = re.compile(r"[\u0900-\u097F]")
    LATIN_ENGLISH_PATTERN = re.compile(r"[A-Za-z]")

    @classmethod
    def detect(cls, text: str) -> Tuple[str, Dict[str, float]]:
        """
        Detect whether language is Gujarati ('guj'), Hindi ('hin'), or English ('eng').
        Returns (primary_language, distribution_scores)
        """
        if not text or not text.strip():
            return "eng", {"eng": 1.0, "hin": 0.0, "guj": 0.0}

        guj_count = len(cls.GUJARATI_PATTERN.findall(text))
        hin_count = len(cls.DEVANAGARI_HINDI_PATTERN.findall(text))
        eng_count = len(cls.LATIN_ENGLISH_PATTERN.findall(text))

        total = guj_count + hin_count + eng_count
        if total == 0:
            return "eng", {"eng": 1.0, "hin": 0.0, "guj": 0.0}

        dist = {
            "guj": round(guj_count / total, 3),
            "hin": round(hin_count / total, 3),
            "eng": round(eng_count / total, 3),
        }

        # If Gujarati characters make up > 15%, classify as Gujarati
        if dist["guj"] >= 0.15 and dist["guj"] >= dist["hin"]:
            return "guj", dist
        # If Hindi characters make up > 15%
        if dist["hin"] >= 0.15 and dist["hin"] > dist["guj"]:
            return "hin", dist

        return "eng", dist
