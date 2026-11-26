import sys
import asyncio

sys.path.insert(0, "backend")
from app.db.mongodb import connect_to_mongodb, get_database, close_mongodb_connection

async def main():
    await connect_to_mongodb()
    db = get_database()
    
    # 1. Check all 7 documents and their normalized text
    docs = await db.documents.find({}).to_list(100)
    print(f"=== Total Documents in DB: {len(docs)} ===")
    for d in docs:
        doc_id = d["_id"]
        pages = await db.document_pages.find({"document_id": doc_id}).to_list(10)
        norm_len = sum(len(p.get("normalized_text", "")) for p in pages)
        print(f"Doc {doc_id} ({d.get('document_title')}): {len(pages)} pages, total normalized_text chars = {norm_len}")
    
    # 2. Check entities scoped specifically to DOC-D01
    ents_d01 = await db.entities.find({"source_occurrences.document_id": "DOC-D01"}).to_list(100)
    print(f"\n=== Entities scoped to DOC-D01: {len(ents_d01)} ===")
    for e in ents_d01:
        print(f"  - {e.get('entity_name')} ({e.get('entity_type')})")

    # 3. Check entities scoped to DOC-D02
    ents_d02 = await db.entities.find({"source_occurrences.document_id": "DOC-D02"}).to_list(100)
    print(f"\n=== Entities scoped to DOC-D02: {len(ents_d02)} ===")
    for e in ents_d02:
        print(f"  - {e.get('entity_name')} ({e.get('entity_type')})")

    # 4. Check whether out-of-document entities leak into DOC-D01
    leaked_names = ["14th August 2023", "A. K. Solanki", "Apex Infra Enterprises", "Devendra Solanki"]
    found_leaks = [e["entity_name"] for e in ents_d01 if e["entity_name"] in leaked_names]
    print(f"\nLeak check for DOC-D01 (expect 0 leaks): {found_leaks}")

    await close_mongodb_connection()

if __name__ == "__main__":
    asyncio.run(main())
