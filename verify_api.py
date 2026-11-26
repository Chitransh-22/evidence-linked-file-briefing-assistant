import sys
import asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, "backend")
from app.main import app
from app.core.security import create_access_token
from app.db.mongodb import connect_to_mongodb, close_mongodb_connection

async def main():
    await connect_to_mongodb()
    transport = ASGITransport(app=app)
    token = create_access_token({"sub": "investigator", "role": "investigating_officer"})
    headers = {"Authorization": f"Bearer {token}"}
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: Fetch document pages for DOC-D01 (ensure normalized_text is present)
        pages_resp = await client.get("/api/v1/documents/DOC-D01/pages", headers=headers)
        assert pages_resp.status_code == 200, f"Pages status: {pages_resp.status_code}"
        pages_data = pages_resp.json()
        pages = pages_data.get("pages", [])
        print(f"API /documents/DOC-D01/pages: {len(pages)} pages")
        for p in pages:
            norm = p.get("normalized_text", "")
            print(f"  Page {p['page_number']} normalized_text length: {len(norm)}")
            assert len(norm) > 0, "Normalized text should not be empty!"

        # Test 2: Fetch entities scoped to DOC-D01
        ent_resp = await client.get("/api/v1/entities?document_id=DOC-D01&limit=100", headers=headers)
        assert ent_resp.status_code == 200, f"Entities status: {ent_resp.status_code}"
        ent_data = ent_resp.json()
        items = ent_data.get("items", [])
        print(f"\nAPI /entities?document_id=DOC-D01: {len(items)} entities returned")
        for it in items:
            print(f"  - {it['entity_name']} ({it['entity_type']})")
        
        # Verify no alien entities exist
        names = [it["entity_name"] for it in items]
        assert "A. K. Solanki" not in names
        assert "Apex Infra Enterprises" not in names
        assert "14th August 2023" not in names
        assert "BlueRiver Relief Logistics" in names
        assert "Kavita Parmar" in names
        print("\nAll API assertions PASSED successfully!")

    await close_mongodb_connection()

if __name__ == "__main__":
    asyncio.run(main())
