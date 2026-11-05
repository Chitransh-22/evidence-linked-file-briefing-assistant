import re
from typing import List, Dict, Any
from app.core.logging import logger

try:
    import nltk
    from nltk.tokenize import sent_tokenize, word_tokenize
except ImportError:
    nltk = None
    sent_tokenize = None
    word_tokenize = None


class NLTKProcessor:
    @staticmethod
    def is_available() -> bool:
        return nltk is not None

    @staticmethod
    def segment_sentences(text: str) -> List[str]:
        if not text or not text.strip():
            return []

        if sent_tokenize:
            try:
                sentences = sent_tokenize(text)
                return [s.strip() for s in sentences if s.strip()]
            except Exception as e:
                logger.warning(f"NLTK sent_tokenize failed ({e}), falling back to regex boundary splitter.")

        # Robust regex sentence boundary splitter fallback
        raw_splits = re.split(r"(?<=[.!?।])\s+", text)
        return [s.strip() for s in raw_splits if s.strip()]

    @staticmethod
    def tokenize_words(text: str) -> List[str]:
        if not text or not text.strip():
            return []

        if word_tokenize:
            try:
                return word_tokenize(text)
            except Exception:
                pass

        return re.findall(r"\b\w+\b", text)

    @classmethod
    def process_document_text(cls, text: str) -> Dict[str, Any]:
        """
        NLTK processing stage after language routing and normalization.
        """
        sentences = cls.segment_sentences(text)
        total_words = 0
        sentence_records = []

        for idx, sentence in enumerate(sentences):
            words = cls.tokenize_words(sentence)
            total_words += len(words)
            sentence_records.append({
                "sentence_index": idx + 1,
                "text": sentence,
                "token_count": len(words),
            })

        return {
            "sentence_count": len(sentences),
            "word_count": total_words,
            "sentences": sentence_records,
            "processor": "nltk_punkt_v3" if nltk else "regex_fallback",
        }
