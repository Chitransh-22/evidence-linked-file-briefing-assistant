import re
from typing import List, Dict, Any, Tuple
from app.core.config import settings
from app.core.logging import logger


class GovernmentNERService:
    """
    Named Entity Recognition engine optimized for government documents, investigative reports,
    and administrative records across English, Hindi, and Gujarati contexts.
    """

    # Regex patterns for high-precision entity categories
    DATE_PATTERNS = [
        re.compile(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b", re.IGNORECASE),
        re.compile(r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b", re.IGNORECASE),
        re.compile(r"\b\d{4}[/-]\d{2}[/-]\d{2}\b"),
    ]

    TIME_PATTERNS = [
        re.compile(r"\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|hrs|hours|IST)?\b", re.IGNORECASE),
    ]

    MONEY_PATTERNS = [
        re.compile(r"(?:Rs\.?|INR|₹|\$|USD)\s*[\d,]+(?:\.\d{1,2})?(?:\s*(?:Crore|Cr|Lakh|Lac|Million|Billion))?", re.IGNORECASE),
        re.compile(r"\b[\d,]+(?:\.\d{1,2})?\s*(?:Crores?|Lakhs?|Lacs?|Rupees)\b", re.IGNORECASE),
    ]

    PHONE_PATTERNS = [
        re.compile(r"\b(?:\+91[-\s]?)?[6-9]\d{9}\b"),
        re.compile(r"\b0\d{2,4}[-\s]?\d{6,8}\b"),
    ]

    EMAIL_PATTERNS = [
        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    ]

    REF_DOC_PATTERNS = [
        re.compile(r"\b(?:F\.No\.|Ref\s*No\.?|Case\s*No\.?|FIR\s*No\.?|RC\s*No\.?|File\s*No\.?|Order\s*No\.?)\s*[:/-]?\s*[A-Za-z0-9/_-]+\b", re.IGNORECASE),
        re.compile(r"\b[A-Z]{2,4}/\d{2,6}/\d{2,4}\b"),
    ]

    VEHICLE_PATTERNS = [
        re.compile(r"\b[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{1,4}\b"),  # Indian vehicle registration format (e.g., GJ01AB1234)
    ]

    GOVT_DEPTS = [
        "Department of Revenue", "Enforcement Directorate", "Central Bureau of Investigation",
        "Anti-Corruption Bureau", "Income Tax Department", "Ministry of Home Affairs",
        "Ministry of Finance", "State Police", "CID", "Vigilance Commission",
        "Municipal Corporation", "District Collectorate", "Registrar of Companies",
        "महસૂલ વિભાગ", "પોલીસ વિભાગ", "તકેદારી આયોગ", "આવકવેરા વિભાગ", "મહેસૂલ શાખા"
    ]

    PERSON_TITLES = [
        r"(?:Shri|Smt|Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Adv\.|Inspector|Officer|Commissioner|Superintendent|Constable)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})",
        r"(?:શ્રી|શ્રીમતી|ડૉ\.|પોલીસ ઇન્સ્પેક્ટર)\s+([\u0A80-\u0AFF]+(?:\s+[\u0A80-\u0AFF]+){1,2})"
    ]

    ORGANIZATION_KEYWORDS = [
        "Pvt Ltd", "Private Limited", "Limited", "Ltd", "LLP", "Corporation", "Bank",
        "Enterprises", "Industries", "Infra", "Holdings", "Agency", "Foundation", "Trust"
    ]

    def extract_entities(
        self,
        text: str,
        document_id: str,
        page_number: int,
        para_number: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Extract named entities from document page/paragraph text with source offsets and confidence.
        """
        entities = []

        # 1. Date
        for pat in self.DATE_PATTERNS:
            for match in pat.finditer(text):
                entities.append(self._build_entity_record(
                    name=match.group(),
                    category="Date",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(match.start(), match.end()),
                    conf=0.95
                ))

        # 2. Time
        for pat in self.TIME_PATTERNS:
            for match in pat.finditer(text):
                entities.append(self._build_entity_record(
                    name=match.group(),
                    category="Time",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(match.start(), match.end()),
                    conf=0.90
                ))

        # 3. Monetary Amount
        for pat in self.MONEY_PATTERNS:
            for match in pat.finditer(text):
                entities.append(self._build_entity_record(
                    name=match.group(),
                    category="Monetary Amount",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(match.start(), match.end()),
                    conf=0.92
                ))

        # 4. Phone Number
        for pat in self.PHONE_PATTERNS:
            for match in pat.finditer(text):
                entities.append(self._build_entity_record(
                    name=match.group(),
                    category="Phone Number",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(match.start(), match.end()),
                    conf=0.95
                ))

        # 5. Email Address
        for pat in self.EMAIL_PATTERNS:
            for match in pat.finditer(text):
                entities.append(self._build_entity_record(
                    name=match.group(),
                    category="Email Address",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(match.start(), match.end()),
                    conf=0.98
                ))

        # 6. Reference / Document Number
        for pat in self.REF_DOC_PATTERNS:
            for match in pat.finditer(text):
                entities.append(self._build_entity_record(
                    name=match.group(),
                    category="Reference Number",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(match.start(), match.end()),
                    conf=0.93
                ))

        # 7. Vehicle Identifier
        for pat in self.VEHICLE_PATTERNS:
            for match in pat.finditer(text):
                entities.append(self._build_entity_record(
                    name=match.group(),
                    category="Vehicle Identifier",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(match.start(), match.end()),
                    conf=0.88
                ))

        # 8. Government Department
        for dept in self.GOVT_DEPTS:
            start = 0
            while True:
                idx = text.lower().find(dept.lower(), start)
                if idx == -1:
                    break
                entities.append(self._build_entity_record(
                    name=text[idx:idx+len(dept)],
                    category="Government Department",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(idx, idx+len(dept)),
                    conf=0.96
                ))
                start = idx + len(dept)

        # 9. Persons
        for pat_str in self.PERSON_TITLES:
            for match in re.finditer(pat_str, text):
                full_name = match.group(1).strip()
                entities.append(self._build_entity_record(
                    name=full_name,
                    category="Person",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(match.start(1), match.end(1)),
                    conf=0.88
                ))

        # 10. Organization
        for kw in self.ORGANIZATION_KEYWORDS:
            org_pat = rf"\b([A-Z][A-Za-z0-9&.\s]{{2,30}}\s+{kw})\b"
            for match in re.finditer(org_pat, text):
                org_name = match.group(1).strip()
                entities.append(self._build_entity_record(
                    name=org_name,
                    category="Organization",
                    doc_id=document_id,
                    page=page_number,
                    para=para_number,
                    span=(match.start(1), match.end(1)),
                    conf=0.85
                ))

        # Deduplicate occurrences within the same paragraph while preserving distinct entity values
        unique_entities = []
        seen = set()
        for e in entities:
            key = (e["entity_name"].lower(), e["entity_type"], e["page_number"])
            if key not in seen:
                seen.add(key)
                unique_entities.append(e)

        return unique_entities

    def _build_entity_record(
        self,
        name: str,
        category: str,
        doc_id: str,
        page: int,
        para: int,
        span: Tuple[int, int],
        conf: float
    ) -> Dict[str, Any]:
        return {
            "entity_name": name.strip(),
            "normalized_name": name.strip().lower(),
            "entity_type": category,
            "document_id": doc_id,
            "page_number": page,
            "paragraph_reference": para,
            "source_span": list(span),
            "extraction_confidence": conf,
            "extraction_method": "regex_gov_ner_v1",
        }


_ner_service = GovernmentNERService()


def get_ner_service() -> GovernmentNERService:
    return _ner_service
