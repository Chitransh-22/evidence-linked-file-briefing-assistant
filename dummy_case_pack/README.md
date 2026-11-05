# Synthetic Demo Case Pack - NVD-DR-2026-014

**IMPORTANT:** This is a completely fictional, synthetic test case. All names, departments, locations, dates, records, reference numbers and events are invented for software demonstration. It is not an official record and must not be used to make real administrative, legal or enforcement decisions.

## Case

**Reference:** NVD-DR-2026-014  
**Title:** Review of Emergency Water Purification Kit Procurement and Distribution - Monsoon Response 2026  
**Fictional department:** Nandivan District Relief Office  
**Category:** Relief Procurement and Distribution Review  

The case concerns an order for 480 emergency water purification kits at INR 1,250 each (INR 600,000 total). The supplied synthetic records intentionally differ on the receipt date and quantity, distribution totals and supporting paperwork. These differences are included to exercise extraction, chronology, evidence retrieval, contradiction detection and claim verification.

## Included documents

| ID | File | Mode | Language | Expected route |
|---|---|---|---|---|
| DOC-D01 | D01_Complaint_Gujarati_Scanned.pdf | Image-only scanned PDF | Gujarati | OCR + IndicTrans2 |
| DOC-D02 | D02_Inspection_Memo_Hindi_Scanned.pdf | Image-only scanned PDF | Hindi | OCR + IndicTrans2 |
| DOC-D03 | D03_Work_Order_English_Digital.pdf | Digital text PDF | English | PDF parser + English bypass |
| DOC-D04 | D04_Stock_Register_Gujarati_Scanned.pdf | Image-only scanned PDF | Gujarati | OCR + IndicTrans2 |
| DOC-D05 | D05_Vehicle_Gate_Log_English_Digital.pdf | Digital text PDF | English | PDF parser + English bypass |
| DOC-D06 | D06_Beneficiary_Statements_Hindi_Scanned.pdf | Image-only scanned PDF | Hindi | OCR + IndicTrans2 |
| DOC-D07 | D07_Supplier_Invoice_English_Digital.pdf | Digital text PDF | English | PDF parser + English bypass |

## Suggested demo workflow

1. Create the case using `data/case_seed.json` or the case fields in `data/expected_extraction_seed.json`.
2. Upload the seven PDFs to the case. The filenames begin with their document IDs.
3. Let the application independently classify image-only and digital-text PDFs.
4. Verify that the Gujarati and Hindi scans use OCR and translation, while English digital PDFs bypass translation.
5. Verify page-level provenance, NER, LLM extraction, chunking, embedding, Qdrant indexing and Evidence Ledger creation.
6. Compare the extracted evidence to `data/expected_extraction_seed.json`. This file is a test oracle, not source evidence; the application should extract from the PDFs themselves.
7. Run chronology, contradiction detection, retrieval, briefing generation and claim verification.

## Intended review points

- Work order: 480 kits for INR 600,000.
- Stock register: entry for 480 kits at 14:00 on 15 August 2026.
- Gate log: 360 unloaded at 17:30 on 16 August 2026; 120 recorded as departing at 19:10 pending brake inspection.
- Invoice: 480 kits for INR 600,000.
- Inspection: 24 physically present; 6 sample/testing issues; 330 reported distributed by 18 August (Ward 3: 250; Ward 4: 80).
- Complaint: reports 300 in Ward 3 and 60 in Ward 4; says the Ward 3 list has only 240 household names and Ward 5 had none as of 18 August.
- Signed delivery challan: inspection memo says the original signed challan was not produced.

## Important interpretation note

The expected contradiction candidates are deliberately provisional. For example, a stock-register entry and gate movement register may not be directly comparable unless all delivery trips and source records are obtained. Distribution figures can differ due to cut-off times, versions of registers or reporting scope. A real officer must review the source records before resolving these points.

## Files

- `data/case_seed.json`: case metadata suitable for a case-create form or seed script.
- `data/expected_extraction_seed.json`: synthetic expected entities, evidence, events, contradiction candidates, claim statuses and briefing draft for QA comparison.
- `documents/`: seven source PDFs.

All PDFs include a synthetic-demo disclaimer. Scanned PDFs are image-only so they exercise OCR. English digital PDFs contain selectable/extractable text.
