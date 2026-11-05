import os
import sys
import json
import hashlib
import asyncio
from datetime import datetime, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.db.mongodb import connect_to_mongodb, close_mongodb_connection, get_database
from app.db.indexes import init_database_indexes
from app.integrations.object_storage.adapter import get_storage_adapter
from app.integrations.embedding_provider.embedder import get_embedding_provider
from app.integrations.vector_database.qdrant import get_qdrant_service
from app.services.audit_service import AuditService

CASE_ID = "CASE-NVD-DR-2026-014"
CASE_REF = "NVD-DR-2026-014"
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PACK_DIR = os.path.join(BASE_DIR, "dummy_case_pack")
DOCS_DIR = os.path.join(PACK_DIR, "documents")
DATA_DIR = os.path.join(PACK_DIR, "data")


async def register_dummy_case(close_conn: bool = True):
    print(f"--- Registering Synthetic Demo Case: {CASE_REF} ---")
    await connect_to_mongodb()
    await init_database_indexes()
    db = get_database()
    storage = get_storage_adapter()

    # 1. Register or Update Case
    existing_case = await db.cases.find_one({"$or": [{"_id": CASE_ID}, {"case_reference": CASE_REF}]})
    actual_case_id = existing_case["_id"] if existing_case else CASE_ID

    case_meta = {
        "_id": actual_case_id,
        "case_id": actual_case_id,
        "case_reference": CASE_REF,
        "title": "Review of Emergency Water Purification Kit Procurement and Distribution - Monsoon Response 2026",
        "category": "Relief Procurement and Distribution Review",
        "department": "Nandivan District Relief Office (fictional)",
        "district": "Nandivan (fictional district)",
        "description": "A synthetic administrative review into quantity reconciliation, stock recording and beneficiary distribution of 480 emergency water purification kits ordered during a fictional monsoon response.",
        "priority": "Medium",
        "status": "Active",
        "date_opened": "2026-08-20",
        "assigned_officers": ["investigator", "reviewer", "intake_officer", "admin", "auditor"],
        "currency": "INR",
        "tags": [
            "synthetic-demo",
            "procurement",
            "relief-material",
            "multilingual",
            "ocr",
            "contradiction-testing"
        ],
        "created_by": "investigator",
        "created_at": "2026-08-20T10:00:00Z",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.cases.update_one({"_id": actual_case_id}, {"$set": case_meta}, upsert=True)
    print(f"Registered Case: {CASE_REF} (ID: {actual_case_id}) -> {case_meta['title']}")

    # 2. Ingest 7 Source PDFs and Create Document & Page Records
    doc_definitions = [
        {
            "id": "DOC-D01",
            "filename": "D01_Complaint_Gujarati_Scanned.pdf",
            "title": "Citizen Complaint Regarding Kit Distribution (Ward 3 & 4)",
            "category": "Citizen Complaint",
            "authority": "Nandivan District Collectorate (Public Grievance Desk)",
            "received_date": "2026-08-18",
            "language": "guj",
            "classification": "scanned",
            "ocr_confidence": 96.2,
            "original_text": "નાંદીવાન જિલ્લો રાહત કચેરી - ચોમાસા પ્રતિભાવ ૨૦૨૬\nફરિયાદ અરજી\nઅરજદાર: સ્થાનિક નાગરિક, વોર્ડ ૩, નાંદીવાન\nવિષય: કટોકટી જળ શુદ્ધિકરણ કિટના વિતરણમાં ગેરરીતિ બાબત\nસંદર્ભ કેસ: NVD-DR-2026-014\nતારીખ: ૧૮-૦૮-૨૦૨૬\n\nમહોદય,\nઆ સાથે જણાવવાનું કે બ્લુ રિવર રિલીફ લોજિસ્ટિક્સ દ્વારા પૂરી પાડવામાં આવેલ ૪૮૦ કિટ પૈકી વોર્ડ ૩ માં ૩૦૦ કિટ વિતરિત થયાનું દર્શાવાયું છે. પરંતુ સ્થાનિક લાભાર્થી યાદીમાં માત્ર 240 પરિવારોના નામ છે. વોર્ડ 4 માં 60 કિટ આપવામાં આવી હોવાનું જણાવવામાં આવ્યું છે. વોર્ડ 5 માં 18-08-2026 સુધી કોઈ કિટ મળી નથી.\nઆ અંગે તાત્કાલિક સ્વતંત્ર તપાસ કરવા નમ્ર વિનંતી છે.\nસહી: કવિતા પરમાર (વોર્ડ ૩ પ્રતિનિધિ)",
            "translated_text": "Nandivan District Relief Office - Monsoon Response 2026\nComplaint Application\nApplicant: Local Resident, Ward 3, Nandivan\nSubject: Irregularities in Emergency Water Purification Kit Distribution\nCase Reference: NVD-DR-2026-014\nDate: 18-08-2026\n\nRespected Sir,\nIt is submitted that out of 480 kits supplied by BlueRiver Relief Logistics, 300 kits are shown as distributed in Ward 3. However, the local beneficiary list contains names of only 240 households. In Ward 4, 60 kits are reported to have been distributed. In Ward 5, no kits have been received as of 18-08-2026.\nIt is requested that an immediate independent inquiry be conducted into this matter.\nSigned: Kavita Parmar (Ward 3 Representative)",
        },
        {
            "id": "DOC-D02",
            "filename": "D02_Inspection_Memo_Hindi_Scanned.pdf",
            "title": "Joint Physical Inspection Memo of District Relief Store",
            "category": "Inspection Memo",
            "authority": "Nandivan District Vigilance & Inspection Committee",
            "received_date": "2026-08-20",
            "language": "hin",
            "classification": "scanned",
            "ocr_confidence": 97.4,
            "original_text": "नांदीवान जिला राहत भंडार - संयुक्त भौतिक निरीक्षण ज्ञापन\nसमीक्षा संदर्भ: NVD-DR-2026-014\nदिनांक: 20-08-2026 (निरीक्षण तिथि: 19-08-2026)\nस्थान: नांदीवान जिला राहत भंडार, सेक्टर 2\n\nनिरीक्षण निष्कर्ष:\n1. कार्य आदेश NDR/WO/2026/041 के तहत 480 जल शुद्धिकरण किट की खरीद स्वीकृत थी।\n2. वितरण सारांश में 18-08-2026 तक कुल 330 किट जारी दर्शाई गई हैं: वार्ड 3 में 250 और वार्ड 4 में 80।\n3. भौतिक सत्यापन के समय भंडार में 24 किट उपलब्ध पाई गईं। भंडार कर्मचारी ने बताया कि 18-08-2026 को 6 किट नमूना और परीक्षण हेतु जारी की गई थीं।\n4. निरीक्षण के समय मूल हस्ताक्षरित आपूर्ति चालान उपलब्ध नहीं कराया गया।\n5. अतः भौतिक स्टॉक 24, नमूना 6 तथा दर्ज वितरण 330 का कुल योग 360 बनता है, जो कार्य आदेश की 480 किट से 120 कम है।\nहस्ताक्षर: ए. के. सोलंकी (निरीक्षण अधिकारी) एवं देवेन्द्र सोलंकी (भंडार प्रभारी)",
            "translated_text": "Nandivan District Relief Store - Joint Physical Inspection Memo\nReview Reference: NVD-DR-2026-014\nDate: 20-08-2026 (Inspection Date: 19-08-2026)\nLocation: Nandivan District Relief Store, Sector 2\n\nInspection Findings:\n1. Under Work Order NDR/WO/2026/041, procurement of 480 water purification kits was approved.\n2. In the distribution summary, a total of 330 kits are shown issued up to 18-08-2026: 250 in Ward 3 and 80 in Ward 4.\n3. During physical verification, 24 kits were found available in store. Store employee stated that on 18-08-2026, 6 kits were issued for sample and testing.\n4. At the time of inspection, the original signed delivery challan was not produced.\n5. Therefore, physical stock (24) + sample (6) + recorded distribution (330) totals 360 units, which is 120 units less than the 480 kits in the work order.\nSigned: A. K. Solanki (Inspection Officer) and Devendra Solanki (Store In-charge)",
        },
        {
            "id": "DOC-D03",
            "filename": "D03_Work_Order_English_Digital.pdf",
            "title": "Emergency Supply Work Order NDR/WO/2026/041",
            "category": "Procurement Order",
            "authority": "Nandivan District Relief Office",
            "received_date": "2026-08-12",
            "language": "eng",
            "classification": "digital",
            "ocr_confidence": 100.0,
            "original_text": "SYNTHETIC DEMO DOCUMENT - NOT AN OFFICIAL RECORD\nEMERGENCY SUPPLY WORK ORDER\nReference: NDR/WO/2026/041\nDate: 12 August 2026\nIssuing office: Nandivan District Relief Office (fictional). Case reference: NVD-DR-2026-014.\nSupplier: BlueRiver Relief Logistics (fictional). Supply item: portable water purification kit, standard household model.\n1. Quantity and price\nApproved quantity: 480 kits. Unit rate: INR 1,250. Total order value: INR 600,000 (Rupees Six Lakh only), before any separately approved adjustment.\n2. Delivery conditions\nFull delivery required to Nandivan District Relief Store, Sector 2, within four calendar days of this order.\nEach consignment must be accompanied by a signed delivery challan bearing the receiving store officer stamp.\n3. Inspection\nReceipt is subject to count verification and physical sample inspection before payment processing.\nSigned:\nR. Mehta\nAssistant Relief Officer, Nandivan District Relief Office",
            "translated_text": "SYNTHETIC DEMO DOCUMENT - NOT AN OFFICIAL RECORD\nEMERGENCY SUPPLY WORK ORDER\nReference: NDR/WO/2026/041\nDate: 12 August 2026\nIssuing office: Nandivan District Relief Office (fictional). Case reference: NVD-DR-2026-014.\nSupplier: BlueRiver Relief Logistics (fictional). Supply item: portable water purification kit, standard household model.\n1. Quantity and price\nApproved quantity: 480 kits. Unit rate: INR 1,250. Total order value: INR 600,000 (Rupees Six Lakh only), before any separately approved adjustment.\n2. Delivery conditions\nFull delivery required to Nandivan District Relief Store, Sector 2, within four calendar days of this order.\nEach consignment must be accompanied by a signed delivery challan bearing the receiving store officer stamp.\n3. Inspection\nReceipt is subject to count verification and physical sample inspection before payment processing.\nSigned:\nR. Mehta\nAssistant Relief Officer, Nandivan District Relief Office",
        },
        {
            "id": "DOC-D04",
            "filename": "D04_Stock_Register_Gujarati_Scanned.pdf",
            "title": "Relief Store Stock Register - Monsoon Response",
            "category": "Stock Register",
            "authority": "Nandivan District Relief Store, Sector 2",
            "received_date": "2026-08-18",
            "language": "guj",
            "classification": "scanned",
            "ocr_confidence": 95.8,
            "original_text": "નાંદીવાન જિલ્લો રાહત ભંડાર, સેક્ટર ૨ - સ્ટોક રજિસ્ટર (ચોમાસા રાહત ૨૦૨૬)\nવસ્તુ: પોર્ટેબલ વોટર પ્યુરિફિકેશન કિટ\nસંદર્ભ: NVD-DR-2026-014\n\nનોંધણી વિગતો:\n૧૫-૦૮-૨૦૨૬ ૧૪:૦૦ | બ્લુ રિવર રિલીફ લોજિસ્ટિક્સ; ચલણ ૮૮ | આવક: ૪૮૦ | જાવક: ૦ | સિલક: ૪૮૦\n૧૭-૦૮-૨૦૨૬ ૧૦:૩૦ | વોર્ડ ૩ વિતરણ (ચલણ ૧૪૧) | આવક: ૦ | જાવક: ૨૫૦ | સિલક: ૨૩૦\n૧૭-૦૮-૨૦૨૬ ૧૫:૦૦ | વોર્ડ ૪ વિતરણ (ચલણ ૧૪૨) | આવક: ૦ | જાવક: ૮૦ | સિલક: ૧૫૦\n૧૮-૦૮-૨૦૨૬ | નમૂના / પરીક્ષણ | આવક: ૦ | જાવક: ૬ | સિલક: ૧૪૪\n\nનોંધ: ૧૮-૦૮-૨૦૨૬ ના રોજ નોંધાયેલ આખરી સ્ટોક સિલક ૧૪૪ કિટ છે.\nસહી: દેવેન્દ્ર સોલંકી (સ્ટોક રજિસ્ટ્રાર)",
            "translated_text": "Nandivan District Relief Store, Sector 2 - Stock Register (Monsoon Relief 2026)\nItem: Portable Water Purification Kit\nReference: NVD-DR-2026-014\n\nEntry Details:\n15-08-2026 14:00 | BlueRiver Relief Logistics; Challan 88 | Inward: 480 | Outward: 0 | Balance: 480\n17-08-2026 10:30 | Ward 3 Distribution (Challan 141) | Inward: 0 | Outward: 250 | Balance: 230\n17-08-2026 15:00 | Ward 4 Distribution (Challan 142) | Inward: 0 | Outward: 80 | Balance: 150\n18-08-2026 | Sample / Testing | Inward: 0 | Outward: 6 | Balance: 144\n\nNote: Recorded closing balance on 18-08-2026 is 144 kits.\nSigned: Devendra Solanki (Stock Registrar)",
        },
        {
            "id": "DOC-D05",
            "filename": "D05_Vehicle_Gate_Log_English_Digital.pdf",
            "title": "Vehicle Gate Movement Register - Sector 2 Relief Store",
            "category": "Gate Register",
            "authority": "Nandivan District Relief Store Gate Office",
            "received_date": "2026-08-16",
            "language": "eng",
            "classification": "digital",
            "ocr_confidence": 100.0,
            "original_text": "SYNTHETIC DEMO DOCUMENT - NOT AN OFFICIAL RECORD\nVEHICLE GATE MOVEMENT REGISTER\nReference: NDR/GATE/2026/166\nDate: 16 August 2026\nLocation: Nandivan District Relief Store, Sector 2. Register maintained by the store gate desk.\nRecorded movement\nVehicle registration: GJ-00-AB-0000 (fictional demonstration identifier). Supplier: BlueRiver Relief Logistics. Driver name recorded: N. Rathod (fictional).\nEntry time: 17:15. Unloading started: 17:30.\nChallan reference noted at gate: BRL/NDV/88.\nQuantity unloaded: 360 kits counted off vehicle.\nDeparture time: 19:10.\nReason noted for remaining cargo: 120 kits recorded as departing with vehicle to vendor depot pending vehicle brake inspection before remaining run.\nGate clerk signature:\nP. Shah\nSecurity Desk, Nandivan Relief Store",
            "translated_text": "SYNTHETIC DEMO DOCUMENT - NOT AN OFFICIAL RECORD\nVEHICLE GATE MOVEMENT REGISTER\nReference: NDR/GATE/2026/166\nDate: 16 August 2026\nLocation: Nandivan District Relief Store, Sector 2. Register maintained by the store gate desk.\nRecorded movement\nVehicle registration: GJ-00-AB-0000 (fictional demonstration identifier). Supplier: BlueRiver Relief Logistics. Driver name recorded: N. Rathod (fictional).\nEntry time: 17:15. Unloading started: 17:30.\nChallan reference noted at gate: BRL/NDV/88.\nQuantity unloaded: 360 kits counted off vehicle.\nDeparture time: 19:10.\nReason noted for remaining cargo: 120 kits recorded as departing with vehicle to vendor depot pending vehicle brake inspection before remaining run.\nGate clerk signature:\nP. Shah\nSecurity Desk, Nandivan Relief Store",
        },
        {
            "id": "DOC-D06",
            "filename": "D06_Beneficiary_Statements_Hindi_Scanned.pdf",
            "title": "Statements of Selected Beneficiaries (Ward 4)",
            "category": "Beneficiary Statements",
            "authority": "Nandivan District Inquiry Team",
            "received_date": "2026-08-17",
            "language": "hin",
            "classification": "scanned",
            "ocr_confidence": 96.0,
            "original_text": "नांदीवान जिला राहत कार्य - वार्ड 4 लाभार्थी बयान संकलन\nकेस संदर्भ: NVD-DR-2026-014\nदिनांक: 17-08-2026\n\nबयान 1 (कोड W4-HH-011): मैंने 16-08-2026 की शाम को एक जल शुद्धिकरण किट प्राप्त की। किट देने वाले व्यक्ति ने किसी सूची पर हस्ताक्षर कराए। मुझे कुल वितरण संख्या की जानकारी नहीं है।\nबयान 2 (कोड W4-HH-024): मुझे 17-08-2026 की सुबह एक किट मिली। वितरण के समय वाहन वहाँ नहीं था; किट स्थानीय केंद्र से दी गई थी।\nबयान 3 (कोड W4-HH-031): मेरे परिवार को 16-08-2026 को किट नहीं मिली। 17-08-2026 को भी केंद्र पर नाम खोजने पर सूची में नाम नहीं मिला।\nरिकॉर्डकर्ता: राहत दल वार्ड 4",
            "translated_text": "Nandivan District Relief Work - Ward 4 Beneficiary Statements Compilation\nCase Reference: NVD-DR-2026-014\nDate: 17-08-2026\n\nStatement 1 (Code W4-HH-011): I received one water purification kit in the evening of 16-08-2026. The person delivering the kit took signatures on a list. I have no knowledge of the total distribution quantity.\nStatement 2 (Code W4-HH-024): I got one kit in the morning of 17-08-2026. At the time of distribution, the vehicle was not present; kit was handed out from local center.\nStatement 3 (Code W4-HH-031): My family did not receive a kit on 16-08-2026. On 17-08-2026 as well, searching the name at the center yielded no name in the list.\nRecorded by: Relief Team Ward 4",
        },
        {
            "id": "DOC-D07",
            "filename": "D07_Supplier_Invoice_English_Digital.pdf",
            "title": "Supplier Tax Invoice BRL/INV/2026/119",
            "category": "Supplier Invoice",
            "authority": "BlueRiver Relief Logistics",
            "received_date": "2026-08-18",
            "language": "eng",
            "classification": "digital",
            "ocr_confidence": 100.0,
            "original_text": "SYNTHETIC DEMO DOCUMENT - NOT AN OFFICIAL RECORD\nSUPPLIER TAX INVOICE - DEMONSTRATION\nReference: BRL/INV/2026/119\nDate: 18 August 2026\nSupplier: BlueRiver Relief Logistics (fictional). Bill to: Nandivan District Relief Office (fictional).\nRelated work order: NDR/WO/2026/041. Related delivery reference: BRL/NDV/88.\nInvoice details\nDescription: Portable water purification kit\nQuantity: 480\nUnit rate (INR): 1,250\nLine total (INR): 600,000\nSubtotal: INR 600,000\nTotal payable: INR 600,000 (Rupees Six Lakh only)\nPayment terms: 30 days from accepted delivery against verification memo.\nAuthorized signatory:\nFor BlueRiver Relief Logistics\nManager - Institutional Supplies",
            "translated_text": "SYNTHETIC DEMO DOCUMENT - NOT AN OFFICIAL RECORD\nSUPPLIER TAX INVOICE - DEMONSTRATION\nReference: BRL/INV/2026/119\nDate: 18 August 2026\nSupplier: BlueRiver Relief Logistics (fictional). Bill to: Nandivan District Relief Office (fictional).\nRelated work order: NDR/WO/2026/041. Related delivery reference: BRL/NDV/88.\nInvoice details\nDescription: Portable water purification kit\nQuantity: 480\nUnit rate (INR): 1,250\nLine total (INR): 600,000\nSubtotal: INR 600,000\nTotal payable: INR 600,000 (Rupees Six Lakh only)\nPayment terms: 30 days from accepted delivery against verification memo.\nAuthorized signatory:\nFor BlueRiver Relief Logistics\nManager - Institutional Supplies",
        },
    ]

    for d in doc_definitions:
        pdf_path = os.path.join(DOCS_DIR, d["filename"])
        if not os.path.exists(pdf_path):
            print(f"Warning: PDF file {pdf_path} not found.")
            continue

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        file_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
        file_size = len(pdf_bytes)

        # Store in storage adapter
        storage_key = storage.save_original(d["id"], pdf_bytes, d["filename"])

        doc_rec = {
            "_id": d["id"],
            "document_id": d["id"],
            "case_id": actual_case_id,
            "case_reference": CASE_REF,
            "document_title": d["title"],
            "original_filename": d["filename"],
            "storage_key": storage_key,
            "mime_type": "application/pdf",
            "file_size": file_size,
            "sha256": file_sha256,
            "document_category": d["category"],
            "source_authority": d["authority"],
            "received_date": d["received_date"],
            "page_count": 1,
            "classification": d["classification"],
            "language": d["language"],
            "processing_status": "Ready for Review",
            "created_by": "intake_officer",
            "created_at": "2026-08-20T10:00:00Z",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.documents.update_one({"_id": d["id"]}, {"$set": doc_rec}, upsert=True)

        page_rec = {
            "_id": f"{d['id']}_p1",
            "document_id": d["id"],
            "page_number": 1,
            "original_text": d["original_text"],
            "ocr_text": d["original_text"] if d["classification"] == "scanned" else "",
            "normalized_text": d["original_text"],
            "translated_text": d["translated_text"],
            "detected_language": d["language"],
            "extraction_method": "scanned_ocr_tesseract" if d["classification"] == "scanned" else "digital_pymupdf",
            "ocr_confidence": d["ocr_confidence"],
            "layout_metadata": {"blocks_count": 3},
        }
        await db.document_pages.update_one({"_id": page_rec["_id"]}, {"$set": page_rec}, upsert=True)
        print(f"  Ingested Document: {d['id']} ({d['filename']}) - {d['classification'].upper()}")

    # 3. Ingest Entities from seed oracle
    expected_seed_path = os.path.join(DATA_DIR, "expected_extraction_seed.json")
    if os.path.exists(expected_seed_path):
        with open(expected_seed_path, "r", encoding="utf-8") as f:
            seed_data = json.load(f)

        # Entities
        entities = seed_data.get("entities", [])
        for ent in entities:
            ent_id = f"{actual_case_id}_{ent['name'].lower()}_{ent['type']}"
            ent_rec = {
                "_id": ent_id,
                "case_id": actual_case_id,
                "entity_name": ent["name"],
                "normalized_name": ent["name"].lower(),
                "entity_type": ent["type"],
                "source_occurrences": [{"document_id": "DOC-D03", "page_number": 1}],
                "created_at": "2026-08-20T10:00:00Z",
            }
            await db.entities.update_one({"_id": ent_id}, {"$set": ent_rec}, upsert=True)
        print(f"Ingested {len(entities)} Entities for {CASE_REF}")

        # Evidence Records
        evidence_list = seed_data.get("evidence_records", [])
        for ev in evidence_list:
            ev_id = ev["evidence_id"]
            ev_rec = {
                "_id": ev_id,
                "evidence_id": ev_id,
                "case_id": actual_case_id,
                "document_id": ev["document_id"],
                "page_number": ev["page"],
                "paragraph_reference": 1,
                "source_excerpt": ev["excerpt"],
                "normalized_text": ev["excerpt"],
                "translated_text": ev.get("translated_text", ""),
                "evidence_category": ev["category"],
                "associated_entities": [str(v) for v in ev.get("facts", {}).values() if isinstance(v, (str, int))],
                "confidence": 0.95,
                "verification_status": "verified" if ev_id in ["EVD-001", "EVD-003", "EVD-005"] else "unverified",
                "verification_notes": [{"verified_by": "investigator", "status": "verified", "notes": "Corroborated with primary register", "timestamp": "2026-08-20T12:00:00Z"}] if ev_id in ["EVD-001", "EVD-003", "EVD-005"] else [],
                "created_at": "2026-08-20T10:00:00Z",
                "updated_at": "2026-08-20T10:00:00Z",
            }
            await db.evidence_records.update_one({"_id": ev_id}, {"$set": ev_rec}, upsert=True)
        print(f"Ingested {len(evidence_list)} Evidence Records for {CASE_REF}")

        # Events (Chronology)
        events_list = seed_data.get("events", [])
        for evt in events_list:
            evt_id = evt["event_id"]
            evt_rec = {
                "_id": evt_id,
                "event_id": evt_id,
                "case_id": actual_case_id,
                "document_id": evt["evidence_ids"][0] if evt.get("evidence_ids") else "DOC-D03",
                "event_title": evt["title"],
                "description": evt["description"],
                "event_date": evt["date"][:10],
                "original_date_expression": evt["date"],
                "date_precision": evt.get("date_precision", "exact"),
                "associated_entities": [],
                "evidence_ids": evt.get("evidence_ids", []),
                "source_page": 1,
                "confidence": 0.94,
                "review_status": "verified",
                "created_at": "2026-08-20T10:00:00Z",
            }
            await db.events.update_one({"_id": evt_id}, {"$set": evt_rec}, upsert=True)
        print(f"Ingested {len(events_list)} Chronological Events for {CASE_REF}")

        # Contradictions
        contradictions_list = seed_data.get("contradictions", [])
        for con in contradictions_list:
            con_id = con["contradiction_id"]
            ev_ids = con.get("evidence_ids", [])
            con_rec = {
                "_id": con_id,
                "contradiction_id": con_id,
                "case_id": actual_case_id,
                "category": con["category"],
                "evidence_id_a": ev_ids[0] if len(ev_ids) > 0 else "EVD-001",
                "evidence_id_b": ev_ids[1] if len(ev_ids) > 1 else "EVD-002",
                "related_entities": ["BlueRiver Relief Logistics", "Nandivan District Relief Office"],
                "explanation": con["explanation"],
                "confidence": 0.91,
                "status": "Needs Further Review",
                "officer_explanation": None,
                "reviewed_by": None,
                "reviewed_at": None,
                "created_at": "2026-08-20T10:00:00Z",
            }
            await db.contradictions.update_one({"_id": con_id}, {"$set": con_rec}, upsert=True)
        print(f"Ingested {len(contradictions_list)} Potential Contradictions for {CASE_REF}")

        # Briefing & Claims
        claims_list = seed_data.get("claims_for_verification", [])
        briefing_id = "BRF-NVD-DR-2026-014-V1"
        for clm in claims_list:
            clm_rec = {
                "_id": f"{briefing_id}_{clm['claim_id']}",
                "claim_id": clm["claim_id"],
                "briefing_id": briefing_id,
                "claim_statement": clm["claim"],
                "claim": clm["claim"],
                "section": "Core Evidentiary Findings",
                "supporting_evidence_ids": clm.get("supporting_evidence_ids", []),
                "contradictory_evidence_ids": clm.get("contradictory_evidence_ids", []),
                "verification_status": clm.get("expected_status", "Requires Human Review"),
                "verification_explanation": "Pending officer verification determination",
                "verified_by": "investigator",
                "verified_at": "2026-08-20T14:00:00Z",
            }
            await db.claims.update_one({"_id": clm_rec["_id"]}, {"$set": clm_rec}, upsert=True)
        print(f"Ingested {len(claims_list)} Claims for Briefing {briefing_id}")

        # Synthesize Complete 16-Section Briefing
        briefing_sections = {
            "executive_summary": "This synthetic administrative inquiry concerns Emergency Supply Work Order NDR/WO/2026/041 for 480 water purification kits valued at INR 600,000. Significant documentary contradictions exist between the supplier invoice (480 kits), stock register entry (480 kits on 15 August), gate log (360 unloaded, 120 returned on 16 August), and physical vigilance inspection (24 present, 6 sample units, 330 reported distributed by 18 August).",
            "case_background": "Investigation initiated pursuant to complaints of relief distribution discrepancies in Wards 3, 4, and 5 following monsoon response operations in Nandivan District.",
            "jurisdiction_and_authority": "Inquiry conducted under statutory powers of the District Relief & Vigilance Authority, Nandivan.",
            "chronological_summary": "12 Aug: Work Order issued; 15 Aug: Stock register entry logged; 16 Aug: Gate entry shows 360 kits unloaded and 120 returned; 18 Aug: Citizen complaint & supplier invoice issued; 19 Aug: Physical inspection conducted.",
            "key_entities_involved": "BlueRiver Relief Logistics (Supplier), Nandivan District Relief Store, Assistant Relief Officer R. Mehta, Store Keeper Devendra Solanki, Inspection Officer A. K. Solanki.",
            "core_evidentiary_findings": "Documentary proof confirms work order approval of INR 600,000. However, vehicle gate register (DOC-D05) records only 360 units received at store, while stock register records full 480 units. Delivery challan #88 was not produced during physical inspection.",
            "financial_analysis": "Approved procurement expenditure: INR 600,000 (480 units @ INR 1,250). Invoiced amount: INR 600,000. Potential variance of 120 unaccounted units represents INR 150,000 pending delivery verification.",
            "contradictions_and_discrepancies": "Five primary contradictions identified: (1) Receipt date/quantity mismatch between stock register and gate log; (2) Invoiced quantity vs gate unloading; (3) Ward distribution discrepancies; (4) Ward 3 beneficiary count shortfall (240 names vs 300 reported); (5) Stock register balance (144) vs physical inspection count (24).",
            "legal_provisions_invoked": "General Financial Rules (GFR) Rule 149/150 regarding physical stock verification, CrPC Section 91 for production of original delivery challans.",
            "gaps_in_evidence": "Original signed delivery challan BRL/NDV/88, driver trip sheet, vendor depot return receipt, and complete Ward 3 beneficiary acknowledgment lists.",
            "investigative_actions_taken": "Physical inspection of Sector 2 Store on 19 August 2026; collection of vehicle gate register logs; recording of preliminary beneficiary statements in Ward 4.",
            "risk_assessment": "High risk of unauthorized payment release if invoice is processed without reconciliation of the 120 returned units.",
            "recommended_actions": "Withhold invoice payment of INR 600,000; summon driver and store in-charge for sworn statements; secure original signed delivery challan.",
            "annexures_and_references": "Annexure A: Work Order NDR/WO/2026/041; Annexure B: Stock Register Entry; Annexure C: Gate Register Log; Annexure D: Inspection Memo.",
            "officer_certification": "I hereby certify that the evidentiary findings summarized herein have been cross-verified against authenticated documents in the case repository.",
            "supervisory_endorsement": "Briefing submitted for supervisory review and endorsement by the Supervisory Review Commissioner.",
        }

        briefing_doc = {
            "_id": briefing_id,
            "briefing_id": briefing_id,
            "case_id": actual_case_id,
            "case_reference": CASE_REF,
            "title": "Preliminary Evidence Review - Water Purification Kit Procurement and Distribution",
            "status": "Draft",
            "version": 1,
            "created_by": "investigator",
            "created_at": "2026-08-20T12:00:00Z",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "sections": briefing_sections,
            "claims": [f"{briefing_id}_{c['claim_id']}" for c in claims_list],
        }
        await db.briefings.update_one({"_id": briefing_id}, {"$set": briefing_doc}, upsert=True)
        print(f"Created 16-Section Investigation Briefing: {briefing_id}")

    # 4. Update all active users to assign this case
    users = ["admin", "investigator", "reviewer", "intake_officer", "auditor"]
    for u in users:
        await db.users.update_one(
            {"username": u},
            {"$addToSet": {"assigned_cases": {"$each": [actual_case_id, CASE_REF, CASE_ID]}}}
        )
    print(f"Assigned {CASE_REF} to authorized officers ({', '.join(users)})")

    # 5. Populate Vector Index for Semantic Evidence Retrieval
    try:
        embedder = get_embedding_provider()
        qdrant = get_qdrant_service()
        chunks = []
        embeddings = []
        for idx, d in enumerate(doc_definitions):
            content = f"Case {CASE_REF} | Document {d['id']}: {d['title']}. Excerpt: {d['translated_text']}"
            vector = embedder.generate_embedding(content)
            chunks.append({
                "vector_id": idx + 100,
                "case_id": actual_case_id,
                "document_id": d["id"],
                "normalized_text": content,
                "page_start": 1,
                "page_end": 1,
            })
            embeddings.append(vector)
        qdrant.upsert_evidence_chunks(chunks, embeddings)
        print(f"Indexed {len(chunks)} semantic document vectors into Vector Database.")
    except Exception as e:
        print(f"Vector indexing notice: {e}")

    # 6. Audit Event
    await AuditService.log_event(
        user_id="SYSTEM_BOOTSTRAP",
        action="DUMMY_CASE_REGISTERED",
        resource_type="case",
        resource_id=actual_case_id,
        outcome="SUCCESS",
        metadata={
            "case_reference": CASE_REF,
            "documents_count": 7,
            "evidence_count": 13,
            "events_count": 9,
            "contradictions_count": 5,
        }
    )

    print(f"--- Case {CASE_REF} Successfully Registered for Website ---")
    if close_conn:
        await close_mongodb_connection()


if __name__ == "__main__":
    asyncio.run(register_dummy_case())
