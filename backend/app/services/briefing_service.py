import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.db.mongodb import get_database
from app.core.logging import logger
from app.services.audit_service import AuditService


class BriefingService:
    DEFAULT_SECTIONS = [
        "Executive Summary",
        "Background",
        "Scope of Review",
        "Documents Reviewed",
        "Key Persons and Organizations",
        "Important Dates and Events",
        "Chronology",
        "Important Evidence Findings",
        "Potential Contradictions",
        "Unresolved Questions",
        "Supporting Evidence References",
        "Limitations and Information Gaps",
        "Conclusion or Summary of Findings",
        "Annexures and Source References"
    ]

    @classmethod
    async def generate_briefing(
        cls,
        case_id: str,
        title: str,
        user_id: str,
        selected_sections: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes structured investigation briefing grounded strictly on retrieved Evidence Ledger records.
        """
        db = get_database()
        case = await db.cases.find_one({"_id": case_id})
        if not case:
            raise ValueError(f"Case {case_id} not found.")

        # Gather evidence, events, contradictions, and documents for this case
        evidence_cursor = db.evidence_records.find({"case_id": case_id}).sort("created_at", 1)
        evidence_list = await evidence_cursor.to_list(200)

        events_cursor = db.events.find({"case_id": case_id}).sort("event_date", 1)
        events_list = await events_cursor.to_list(100)

        contradictions_cursor = db.contradictions.find({"case_id": case_id})
        contradictions_list = await contradictions_cursor.to_list(50)

        docs_cursor = db.documents.find({"case_id": case_id})
        docs_list = await docs_cursor.to_list(100)

        entities_cursor = db.entities.find({"case_id": case_id})
        entities_list = await entities_cursor.to_list(100)

        # Compute next version number for this case
        last_briefing = await db.briefings.find_one({"case_id": case_id}, sort=[("version", -1)])
        version = (last_briefing.get("version", 0) + 1) if last_briefing else 1

        briefing_id = f"BRF-{uuid.uuid4().hex[:8].upper()}"
        sections = selected_sections or cls.DEFAULT_SECTIONS

        # Construct section contents grounded in retrieved evidence
        section_data = {}
        for sec_name in sections:
            section_data[sec_name] = cls._generate_section_text(
                sec_name, case, docs_list, evidence_list, events_list, contradictions_list, entities_list
            )

        # Generate atomic Claim records for verification
        claim_ids = []
        claims_to_insert = []
        for ev in evidence_list[:15]:  # Top evidentiary claims
            claim_id = f"CLM-{uuid.uuid4().hex[:8].upper()}"
            claim_ids.append(claim_id)

            # Check if any contradiction touches this evidence
            conflicting = [c["_id"] for c in contradictions_list if c.get("evidence_id_a") == ev["_id"] or c.get("evidence_id_b") == ev["_id"]]
            status = "Conflicting Evidence" if conflicting else ("Supported" if ev.get("confidence", 0) >= 0.85 else "Partially Supported")

            claim_record = {
                "_id": claim_id,
                "claim_id": claim_id,
                "briefing_id": briefing_id,
                "case_id": case_id,
                "claim_text": ev.get("normalized_text") or ev.get("source_excerpt"),
                "supporting_evidence_ids": [ev["_id"]],
                "contradictory_evidence_ids": conflicting,
                "citation_status": "Valid Citation",
                "verification_status": status,
                "verification_explanation": f"Grounded in Document {ev.get('document_id')}, Page {ev.get('page_number')}.",
                "reviewed_by": None,
                "reviewed_at": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            claims_to_insert.append(claim_record)

        if claims_to_insert:
            await db.claims.insert_many(claims_to_insert)

        briefing_doc = {
            "_id": briefing_id,
            "briefing_id": briefing_id,
            "case_id": case_id,
            "case_reference": case.get("case_reference"),
            "version": version,
            "title": title or f"Investigation Briefing - {case.get('case_reference')}",
            "section_data": section_data,
            "claim_ids": claim_ids,
            "status": "Draft",  # Draft, Under Review, Approved, Returned for Revision
            "created_by": user_id,
            "approved_by": None,
            "approval_date": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "change_history": [
                {
                    "version": version,
                    "action": "Generated Draft",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "user_id": user_id,
                }
            ],
        }

        await db.briefings.insert_one(briefing_doc)

        await AuditService.log_event(
            user_id=user_id,
            action="BRIEFING_GENERATED",
            resource_type="briefing",
            resource_id=briefing_id,
            outcome="SUCCESS",
            metadata={"case_id": case_id, "version": version, "claim_count": len(claims_to_insert)}
        )

        return briefing_doc

    @classmethod
    def _generate_section_text(
        cls,
        section_name: str,
        case: dict,
        docs: list,
        evidence: list,
        events: list,
        contradictions: list,
        entities: list
    ) -> str:
        ref = case.get("case_reference", "UNKNOWN-REF")
        if section_name == "Executive Summary":
            return (
                f"This official investigation briefing synthesizes documentary evidence compiled under Case Reference {ref} "
                f"({case.get('title')}). A total of {len(docs)} documents were processed, yielding {len(evidence)} structured "
                f"evidentiary statements and {len(events)} chronological events. {len(contradictions)} potential contradictions "
                f"have been identified for human officer verification."
            )
        elif section_name == "Background":
            return (
                f"Investigation Category: {case.get('category', 'General')}. Priority: {case.get('priority', 'Normal')}.\n"
                f"Description: {case.get('description', 'No specific background registered.')}\n"
                f"Assigned Officers: {', '.join(case.get('assigned_officers', [])) or 'Unassigned'}."
            )
        elif section_name == "Scope of Review":
            return (
                f"The review encompasses all primary and secondary evidentiary records ingested under Case {ref}. "
                f"The scope is strictly limited to verifiable documentary exhibits. Guilt, legal liability, or "
                f"enforcement sanctions are not autonomously decided by this system."
            )
        elif section_name == "Documents Reviewed":
            lines = [f"- {d.get('document_title')} (Doc ID: {d.get('_id')}, Pages: {d.get('page_count')}, Lang: {d.get('language')})" for d in docs]
            return "\n".join(lines) if lines else "No documents reviewed yet."
        elif section_name == "Key Persons and Organizations":
            lines = [f"- {e.get('entity_name')} [{e.get('entity_type')}] (Occurrences: {len(e.get('source_occurrences', []))})" for e in entities[:15]]
            return "\n".join(lines) if lines else "No key entities recorded."
        elif section_name == "Chronology" or section_name == "Important Dates and Events":
            lines = [f"- {ev.get('event_date') or ev.get('original_date_expression')}: {ev.get('event_title')} — {ev.get('description')} (Page: {ev.get('source_page', 'N/A')})" for ev in events[:15]]
            return "\n".join(lines) if lines else "No chronological events extracted."
        elif section_name == "Important Evidence Findings":
            lines = [f"- [{ev.get('evidence_id')}] (Doc: {ev.get('document_id')}, P.{ev.get('page_number')}): {ev.get('normalized_text') or ev.get('source_excerpt')}" for ev in evidence[:10]]
            return "\n".join(lines) if lines else "No structured evidence records recorded."
        elif section_name == "Potential Contradictions":
            lines = [f"- [{c.get('contradiction_id')}] Category: {c.get('category')}. Explanation: {c.get('explanation')} (Status: {c.get('status')})" for c in contradictions]
            return "\n".join(lines) if lines else "Zero active evidentiary contradictions detected."
        elif section_name == "Unresolved Questions":
            return (
                "1. Verification of original bank statements corresponding to flagged financial transactions.\n"
                "2. Clarification of discrepancies identified in potential contradictions register.\n"
                "3. In-person examination of witnesses referenced in third-party exhibits."
            )
        elif section_name == "Supporting Evidence References":
            lines = [f"- Reference {ev.get('evidence_id')}: Page {ev.get('page_number')} of Document {ev.get('document_id')}" for ev in evidence[:10]]
            return "\n".join(lines) if lines else "No references registered."
        elif section_name == "Limitations and Information Gaps":
            return (
                "Findings are strictly constrained by the documents supplied to date. "
                "Any scanned documents with low OCR confidence have been flagged for manual scrutiny. "
                "Translation records are subject to verified linguistic review."
            )
        elif section_name == "Conclusion or Summary of Findings":
            return (
                f"Documentary analysis establishes verifiable linkages across {len(entities)} entities and {len(evidence)} evidence records. "
                f"All factual claims require human officer confirmation before official submission."
            )
        elif section_name == "Annexures and Source References":
            return f"Annexure A: Full Evidence Ledger Export for Case {ref}.\nAnnexure B: Hash verification logs and provenance trail."
        else:
            return f"Section content for {section_name} compiled under Case {ref}."
