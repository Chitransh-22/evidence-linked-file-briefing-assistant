import json
import re
from typing import Dict, Any, Optional, List
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.schemas.llm_extraction import StructuredExtractionResult, ExtractedFact, ExtractedEventRecord


class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.base_url = settings.LLM_BASE_URL
        self.model_name = settings.LLM_MODEL_NAME
        self.timeout = settings.LLM_TIMEOUT_SECONDS

    def get_service_status(self) -> Dict[str, Any]:
        """Check status of configured LLM provider."""
        is_live = False
        details = ""
        try:
            with httpx.Client(timeout=2.0) as client:
                if self.provider == "ollama":
                    resp = client.get(f"{self.base_url}/api/tags")
                    if resp.status_code == 200:
                        is_live = True
                        models = [m.get("name") for m in resp.json().get("models", [])]
                        details = f"Connected. Available models: {', '.join(models)}"
                    else:
                        details = f"HTTP {resp.status_code} from {self.base_url}"
                else:
                    details = f"Custom provider '{self.provider}' configured at {self.base_url}"
        except Exception as e:
            details = f"Service unreachable at {self.base_url} ({type(e).__name__}). Using deterministic grounded extractor."

        return {
            "name": "LLM Structured Extraction & Briefing Engine",
            "provider": self.provider,
            "model_name": self.model_name,
            "base_url": self.base_url,
            "status": "available" if is_live else "offline_using_grounded_fallback",
            "details": details,
        }

    async def extract_structured_page_facts(
        self,
        document_id: str,
        page_number: int,
        page_text: str,
        entities: List[Dict[str, Any]],
    ) -> StructuredExtractionResult:
        """
        Extract facts and events grounded strictly in the page text conforming to StructuredExtractionResult.
        """
        # If Ollama is available, attempt real inference with structured schema
        if self.provider == "ollama":
            try:
                res = await self._query_ollama_structured(document_id, page_number, page_text, entities)
                if res:
                    return res
            except Exception as e:
                logger.warning(f"Ollama extraction request failed ({e}); falling back to grounded rule extraction.")

        # Grounded heuristic extractor: strictly extracts actual sentences and mentions
        return self._extract_grounded_deterministic(document_id, page_number, page_text, entities)

    async def _query_ollama_structured(
        self,
        document_id: str,
        page_number: int,
        page_text: str,
        entities: List[Dict[str, Any]],
    ) -> Optional[StructuredExtractionResult]:
        prompt = f"""
You are an AI assistant processing government investigative evidence.
STRICT RULES:
1. Extract ONLY facts explicitly stated in the source text below.
2. Every fact must quote the exact excerpt from the text.
3. NEVER invent dates, amounts, or entities.
4. Output strict JSON matching the schema:
{{
  "facts": [
    {{
      "statement": "string",
      "exact_source_excerpt": "string",
      "evidence_category": "Financial Transaction|Official Communication|Eyewitness Statement|Factual Finding",
      "associated_entities": ["string"],
      "confidence": 0.9,
      "ambiguity_flag": false
    }}
  ],
  "events": [
    {{
      "event_title": "string",
      "description": "string",
      "event_date": "YYYY-MM-DD or null",
      "original_date_expression": "string",
      "date_precision": "exact|approximate|unknown",
      "associated_entities": ["string"],
      "confidence": 0.85
    }}
  ],
  "summary_of_page": "string"
}}

DOCUMENT PAGE TEXT:
\"\"\"{page_text[:4000]}\"\"\"
"""
        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": settings.LLM_TEMPERATURE},
                },
            )
            if resp.status_code == 200:
                raw_json = resp.json().get("response", "{}")
                parsed = json.loads(raw_json)
                return StructuredExtractionResult(
                    document_id=document_id,
                    page_number=page_number,
                    facts=[ExtractedFact(**f) for f in parsed.get("facts", [])],
                    events=[ExtractedEventRecord(**e) for e in parsed.get("events", [])],
                    summary_of_page=parsed.get("summary_of_page", ""),
                    model_name=self.model_name,
                    model_version="ollama-v1",
                )
        return None

    def _extract_grounded_deterministic(
        self,
        document_id: str,
        page_number: int,
        page_text: str,
        entities: List[Dict[str, Any]],
    ) -> StructuredExtractionResult:
        """
        Deterministic, fully grounded extraction engine. Extracts statements containing key entities
        and date expressions without ever fabricating citations or facts.
        """
        sentences = [s.strip() for s in re.split(r"(?<=[.!?।])\s+", page_text) if len(s.strip()) > 15]
        facts: List[ExtractedFact] = []
        events: List[ExtractedEventRecord] = []

        entity_names = [e["entity_name"] for e in entities]
        dates = [e for e in entities if e["entity_type"] == "Date"]

        for idx, sentence in enumerate(sentences[:10]):  # top informative sentences
            # Check what entities appear in this sentence
            matched_entities = [name for name in entity_names if name.lower() in sentence.lower()]

            # Determine evidence category
            category = "Factual Finding"
            if any(term in sentence.lower() for term in ["paid", "amount", "transfer", "cheque", "rs.", "inr", "rupees"]):
                category = "Financial Transaction"
            elif any(term in sentence.lower() for term in ["notice", "letter", "order", "issued", "ref", "dated"]):
                category = "Official Communication"
            elif any(term in sentence.lower() for term in ["stated", "declared", "testified", "witness"]):
                category = "Eyewitness Statement"

            fact = ExtractedFact(
                statement=sentence,
                exact_source_excerpt=sentence,
                evidence_category=category,
                associated_entities=list(set(matched_entities))[:5],
                confidence=0.88 if matched_entities else 0.75,
                ambiguity_flag=False,
            )
            facts.append(fact)

        # Build events from detected dates
        for d in dates:
            # find sentence containing this date
            date_sent = next((s for s in sentences if d["entity_name"].lower() in s.lower()), None)
            if date_sent:
                matched_ents = [name for name in entity_names if name.lower() in date_sent.lower() and name != d["entity_name"]]
                events.append(ExtractedEventRecord(
                    event_title=f"Record dated {d['entity_name']}",
                    description=date_sent,
                    event_date=self._normalize_date_to_iso(d["entity_name"]),
                    original_date_expression=d["entity_name"],
                    date_precision="exact" if re.match(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", d["entity_name"]) else "approximate",
                    associated_entities=list(set(matched_ents))[:4],
                    confidence=0.90,
                ))

        summary = (
            f"Page {page_number} contains {len(sentences)} key statements with {len(entities)} extracted named entities "
            f"covering {', '.join(set(e['entity_type'] for e in entities[:4])) if entities else 'general documentation'}."
        )

        return StructuredExtractionResult(
            document_id=document_id,
            page_number=page_number,
            facts=facts,
            events=events,
            summary_of_page=summary,
            model_name="grounded_deterministic_extractor",
            model_version="1.0.0",
        )

    def _normalize_date_to_iso(self, date_str: str) -> Optional[str]:
        # Simple ISO date normalizer for DD/MM/YYYY or YYYY-MM-DD
        m = re.search(r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", date_str)
        if m:
            return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
        m2 = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", date_str)
        if m2:
            return f"{m2.group(3)}-{int(m2.group(2)):02d}-{int(m2.group(1)):02d}"
        return None


_llm_service = LLMService()


def get_llm_service() -> LLMService:
    return _llm_service
