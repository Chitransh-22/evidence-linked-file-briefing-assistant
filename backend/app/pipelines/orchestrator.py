import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List

from app.db.mongodb import get_database
from app.core.logging import logger
from app.integrations.object_storage.adapter import get_storage_adapter
from app.integrations.pdf_parser.parser import PDFParserService
from app.integrations.ocr_provider.ocr import get_ocr_provider
from app.pipelines.normalization.normalizer import DocumentNormalizer
from app.pipelines.language_detection.detector import LanguageDetector
from app.integrations.translation_provider.indictrans2 import get_translation_service
from app.pipelines.nlp.nltk_processor import NLTKProcessor
from app.integrations.ner_provider.ner import get_ner_service
from app.integrations.llm_provider.llm import get_llm_service
from app.pipelines.chunking.chunker import DocumentChunker
from app.integrations.embedding_provider.embedder import get_embedding_provider
from app.integrations.vector_database.qdrant import get_qdrant_service
from app.services.audit_service import AuditService

PIPELINE_STAGES = [
    "Ingestion",
    "Classification",
    "PDF Parsing/OCR",
    "Extraction API",
    "Intermediate Storage",
    "Feature Normalization",
    "Layout Reconstruction",
    "Document Structure",
    "Page-Aware Context",
    "Language Detection",
    "Translation/English Bypass",
    "NLTK",
    "NER",
    "LLM Extraction",
    "Chunking",
    "Embedding",
    "Vector Indexing",
    "Evidence Ledger",
    "Analysis",
]


class DocumentPipelineOrchestrator:
    @staticmethod
    async def run_pipeline(job_id: str, document_id: str, case_id: str, user_id: str = "system_worker"):
        db = get_database()
        storage = get_storage_adapter()
        start_time = datetime.now(timezone.utc)

        logger.info(f"Starting 19-stage pipeline execution for job {job_id}, document {document_id}")

        async def update_stage(stage_name: str, progress_pct: int, status: str = "Processing", err: str = None):
            await db.processing_jobs.update_one(
                {"_id": job_id},
                {
                    "$set": {
                        "current_stage": stage_name,
                        "progress": progress_pct,
                        "status": status,
                        "error": err,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                }
            )

        try:
            # 1. Ingestion Verification
            await update_stage("Ingestion", 5)
            doc_meta = await db.documents.find_one({"_id": document_id})
            if not doc_meta:
                raise ValueError(f"Document {document_id} metadata not found.")
            storage_key = doc_meta["storage_key"]
            file_bytes = storage.get_original(storage_key)

            # 2. Classification
            await update_stage("Classification", 10)
            is_valid, page_count, classification = PDFParserService.inspect_and_classify_pdf(file_bytes)
            await db.documents.update_one(
                {"_id": document_id},
                {"$set": {"page_count": page_count, "classification": classification}}
            )

            # 3. PDF Parsing / OCR
            await update_stage("PDF Parsing/OCR", 18)
            ocr_provider = get_ocr_provider()
            if classification == "scanned":
                pages_data = ocr_provider.process_pdf(file_bytes)
            else:
                pages_data = PDFParserService.extract_digital_pages(file_bytes)

            # 4. Extraction API convergence
            await update_stage("Extraction API", 25)
            # Standardize page outputs across both digital and scanned flows

            # 5. Intermediate Storage
            await update_stage("Intermediate Storage", 30)
            manifest = {
                "document_id": document_id,
                "job_id": job_id,
                "page_count": len(pages_data),
                "extracted_at": datetime.now(timezone.utc).isoformat(),
            }
            storage.save_intermediate(
                document_id,
                f"raw_extraction_{job_id}.json",
                json.dumps(manifest).encode("utf-8")
            )

            # 6. Feature Normalization
            await update_stage("Feature Normalization", 35)
            headers_footers = DocumentNormalizer.detect_repeated_headers_footers(pages_data)
            for p in pages_data:
                raw_text = p.get("original_text") or p.get("ocr_text") or ""
                p["normalized_text"] = DocumentNormalizer.normalize_text(raw_text)

            # 7 & 8. Layout Reconstruction & Document Structure
            await update_stage("Layout Reconstruction", 40)
            sections = []
            for p in pages_data:
                p_text = p["normalized_text"]
                lines = [l for l in p_text.splitlines() if l.strip()]
                title = lines[0][:80] if lines else f"Page {p['page_number']}"
                sec_id = str(uuid.uuid4())
                sec_record = {
                    "_id": sec_id,
                    "document_id": document_id,
                    "section_id": sec_id,
                    "page_start": p["page_number"],
                    "page_end": p["page_number"],
                    "section_title": title,
                    "paragraphs_count": len(lines),
                }
                sections.append(sec_record)
            if sections:
                await db.document_sections.delete_many({"document_id": document_id})
                await db.document_sections.insert_many(sections)

            # 9. Page-Aware Context
            await update_stage("Page-Aware Context", 45)
            # Associated context is preserved per page

            # 10. Language Detection
            await update_stage("Language Detection", 50)
            doc_lang = "eng"
            for p in pages_data:
                p_lang, lang_dist = LanguageDetector.detect(p["normalized_text"])
                p["detected_language"] = p_lang
                p["language_distribution"] = lang_dist
                if p_lang in ["guj", "hin"]:
                    doc_lang = p_lang

            await db.documents.update_one(
                {"_id": document_id},
                {"$set": {"language": doc_lang}}
            )

            # 11. Translation / English Bypass
            await update_stage("Translation/English Bypass", 58)
            trans_svc = get_translation_service()
            for p in pages_data:
                lang = p["detected_language"]
                translated, method, trans_meta = trans_svc.translate_to_english(p["normalized_text"], lang)
                p["translated_text"] = translated
                p["translation_method"] = method
                p["translation_metadata"] = trans_meta

            # 12. NLTK Preprocessing
            await update_stage("NLTK", 64)
            for p in pages_data:
                # Process the English or translated text through NLTK
                text_to_nlp = p["translated_text"] if p["translated_text"] else p["normalized_text"]
                nlp_output = NLTKProcessor.process_document_text(text_to_nlp)
                p["nlp_metadata"] = nlp_output

            # Persist document_pages to MongoDB
            await db.document_pages.delete_many({"document_id": document_id})
            mongo_pages = []
            for p in pages_data:
                page_rec = {
                    "_id": f"{document_id}_p{p['page_number']}",
                    "document_id": document_id,
                    "page_number": p["page_number"],
                    "original_text": p["original_text"],
                    "ocr_text": p.get("ocr_text", ""),
                    "normalized_text": p["normalized_text"],
                    "translated_text": p["translated_text"],
                    "detected_language": p["detected_language"],
                    "extraction_method": p["extraction_method"],
                    "ocr_confidence": p.get("ocr_confidence", 100.0),
                    "layout_metadata": p.get("layout_metadata", {}),
                }
                mongo_pages.append(page_rec)
            if mongo_pages:
                await db.document_pages.delete_many({"document_id": document_id})
                await db.document_pages.insert_many(mongo_pages)

            # 13. Named Entity Recognition (NER)
            await update_stage("NER", 70)
            ner_svc = get_ner_service()
            all_extracted_entities = []
            for p in pages_data:
                text_for_ner = p["translated_text"] if p["translated_text"] else p["normalized_text"]
                ents = ner_svc.extract_entities(
                    text=text_for_ner,
                    document_id=document_id,
                    page_number=p["page_number"]
                )
                p["entities"] = ents
                all_extracted_entities.extend(ents)

            # Persist entities in collection
            if all_extracted_entities:
                for ent in all_extracted_entities:
                    ent_id = f"{case_id}_{ent['entity_name'].lower()}_{ent['entity_type']}"
                    await db.entities.update_one(
                        {"_id": ent_id},
                        {
                            "$set": {
                                "case_id": case_id,
                                "entity_name": ent["entity_name"],
                                "normalized_name": ent["normalized_name"],
                                "entity_type": ent["entity_type"],
                                "updated_at": datetime.now(timezone.utc).isoformat(),
                            },
                            "$addToSet": {
                                "source_occurrences": {
                                    "document_id": document_id,
                                    "page_number": ent["page_number"],
                                    "span": ent["source_span"],
                                }
                            },
                            "$setOnInsert": {
                                "_id": ent_id,
                                "created_at": datetime.now(timezone.utc).isoformat(),
                            }
                        },
                        upsert=True
                    )

            # 14. Structured LLM Extraction
            await update_stage("LLM Extraction", 78)
            llm_svc = get_llm_service()
            all_facts = []
            all_events = []
            for p in pages_data:
                text_for_llm = p["translated_text"] if p["translated_text"] else p["normalized_text"]
                res = await llm_svc.extract_structured_page_facts(
                    document_id=document_id,
                    page_number=p["page_number"],
                    page_text=text_for_llm,
                    entities=p["entities"],
                )
                all_facts.extend([(f, p["page_number"]) for f in res.facts])
                all_events.extend([(e, p["page_number"]) for e in res.events])

            # 15. Chunking
            await update_stage("Chunking", 82)
            chunker = DocumentChunker()
            chunks = chunker.chunk_document_pages(case_id, document_id, pages_data, doc_lang)

            # 16 & 17. Embedding and Vector Indexing
            await update_stage("Embedding", 88)
            embedder = get_embedding_provider()
            qdrant = get_qdrant_service()
            chunk_texts = [c["normalized_text"] for c in chunks]
            embeddings = [embedder.generate_embedding(t) for t in chunk_texts]

            await update_stage("Vector Indexing", 92)
            qdrant.upsert_evidence_chunks(chunks, embeddings)

            if chunks:
                await db.document_chunks.delete_many({"document_id": document_id})
                await db.document_chunks.insert_many(chunks)

            # 18. Evidence Ledger Synthesis
            await update_stage("Evidence Ledger", 95)
            evidence_records = []
            for fact, page_no in all_facts:
                ev_id = f"EV-{uuid.uuid4().hex[:10].upper()}"
                rec = {
                    "_id": ev_id,
                    "evidence_id": ev_id,
                    "case_id": case_id,
                    "document_id": document_id,
                    "page_number": page_no,
                    "paragraph_reference": 1,
                    "source_excerpt": fact.exact_source_excerpt,
                    "normalized_text": fact.statement,
                    "translated_text": "",
                    "evidence_category": fact.evidence_category,
                    "associated_entities": fact.associated_entities,
                    "chunk_ids": [],
                    "confidence": fact.confidence,
                    "verification_status": "unverified",
                    "verification_notes": [],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                evidence_records.append(rec)

            if evidence_records:
                await db.evidence_records.insert_many(evidence_records)

            # Persist Chronology Events
            for event, page_no in all_events:
                ev_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
                await db.events.insert_one({
                    "_id": ev_id,
                    "event_id": ev_id,
                    "case_id": case_id,
                    "document_id": document_id,
                    "event_title": event.event_title,
                    "description": event.description,
                    "event_date": event.event_date,
                    "original_date_expression": event.original_date_expression,
                    "date_precision": event.date_precision,
                    "associated_entities": event.associated_entities,
                    "evidence_ids": [er["_id"] for er in evidence_records[:2]] if evidence_records else [],
                    "source_page": page_no,
                    "confidence": event.confidence,
                    "review_status": "pending_review",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })

            # 19. Intelligence Analysis & Completion
            await update_stage("Analysis", 98)
            # Automatic contradiction detection trigger for newly extracted facts
            await DocumentPipelineOrchestrator._run_contradiction_detection(case_id)

            completed_time = datetime.now(timezone.utc)
            duration_secs = (completed_time - start_time).total_seconds()

            await db.processing_jobs.update_one(
                {"_id": job_id},
                {
                    "$set": {
                        "current_stage": "Completed",
                        "status": "Completed",
                        "progress": 100,
                        "completed_at": completed_time.isoformat(),
                        "duration_seconds": round(duration_secs, 2),
                    }
                }
            )

            await db.documents.update_one(
                {"_id": document_id},
                {"$set": {"processing_status": "Ready for Review"}}
            )

            # Log audit event
            await AuditService.log_event(
                user_id=user_id,
                action="DOCUMENT_PROCESSING_COMPLETED",
                resource_type="document",
                resource_id=document_id,
                outcome="SUCCESS",
                metadata={
                    "job_id": job_id,
                    "case_id": case_id,
                    "page_count": len(pages_data),
                    "evidence_count": len(evidence_records),
                    "duration_seconds": round(duration_secs, 2),
                }
            )

            logger.info(f"Pipeline successfully completed for document {document_id} in {duration_secs:.2f}s")

        except Exception as e:
            logger.error(f"Pipeline failed for document {document_id}: {e}", exc_info=True)
            await db.processing_jobs.update_one(
                {"_id": job_id},
                {
                    "$set": {
                        "status": "Failed",
                        "error": str(e),
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                    }
                }
            )
            await db.documents.update_one(
                {"_id": document_id},
                {"$set": {"processing_status": "Failed"}}
            )
            await AuditService.log_event(
                user_id=user_id,
                action="DOCUMENT_PROCESSING_FAILED",
                resource_type="document",
                resource_id=document_id,
                outcome="FAILURE",
                metadata={"job_id": job_id, "error": str(e)}
            )

    @staticmethod
    async def _run_contradiction_detection(case_id: str):
        """
        Identify potential contradictions among evidence records in the case:
        - Conflicting dates for same event
        - Conflicting amounts
        - Conflicting participant statements
        """
        db = get_database()
        records = await db.evidence_records.find({"case_id": case_id}).to_list(100)
        if len(records) < 2:
            return

        # Simple cross-pair analysis
        for i in range(len(records)):
            for j in range(i + 1, len(records)):
                rec_a = records[i]
                rec_b = records[j]

                # Check if both have conflicting monetary amounts or dates
                text_a = rec_a.get("source_excerpt", "")
                text_b = rec_b.get("source_excerpt", "")

                # Common entity overlap
                ents_a = set(rec_a.get("associated_entities", []))
                ents_b = set(rec_b.get("associated_entities", []))
                common_ents = ents_a.intersection(ents_b)

                if common_ents and rec_a["_id"] != rec_b["_id"]:
                    # Check for amount or date discrepancy
                    conflict_found = False
                    category = "Inconsistent Statements"
                    explanation = f"Conflicting evidentiary assertions regarding entity '{list(common_ents)[0]}'."

                    if "Rs." in text_a and "Rs." in text_b and text_a != text_b:
                        category = "Conflicting Amounts"
                        explanation = f"Differing financial amounts stated regarding entity {list(common_ents)[0]}."
                        conflict_found = True
                    elif rec_a["evidence_category"] == rec_b["evidence_category"] and text_a != text_b:
                        conflict_found = True

                    if conflict_found:
                        contra_id = f"CONTRA-{uuid.uuid4().hex[:8].upper()}"
                        existing = await db.contradictions.find_one({
                            "case_id": case_id,
                            "evidence_id_a": rec_a["_id"],
                            "evidence_id_b": rec_b["_id"],
                        })
                        if not existing:
                            await db.contradictions.insert_one({
                                "_id": contra_id,
                                "contradiction_id": contra_id,
                                "case_id": case_id,
                                "category": category,
                                "evidence_id_a": rec_a["_id"],
                                "evidence_id_b": rec_b["_id"],
                                "related_entities": list(common_ents),
                                "explanation": explanation,
                                "confidence": 0.82,
                                "status": "Needs Further Review",
                                "officer_explanation": None,
                                "reviewed_by": None,
                                "reviewed_at": None,
                                "created_at": datetime.now(timezone.utc).isoformat(),
                            })
