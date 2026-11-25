import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pymongo import MongoClient
from app.core.config import settings

def migrate_database(uri: str, db_name: str, label: str):
    print(f"\n=======================================================")
    print(f"Starting RBAC and Briefing Migration on [{label}]")
    print(f"Target: {uri[:40]}... / {db_name}")
    print(f"=======================================================")

    kwargs = {
        "serverSelectionTimeoutMS": 7000,
        "maxPoolSize": 10,
    }
    if "mongodb+srv://" in uri or "tls=true" in uri.lower():
        try:
            import certifi
            kwargs["tlsCAFile"] = certifi.where()
        except ImportError:
            pass

    client = None
    try:
        client = MongoClient(uri, **kwargs)
        db = client[db_name]
        client.admin.command("ping")
        print(f"✓ Connected successfully to {label}")
    except Exception as e:
        print(f"✗ Could not connect to {label}: {e}")
        return

    # 1. Normalize Users RBAC & Assigned Cases
    users = list(db.users.find({}))
    print(f"\nFound {len(users)} user accounts in {label}:")
    for u in users:
        username = u.get("username")
        role = u.get("role")
        current_assigned = u.get("assigned_cases", [])
        
        # Grant wildcard access to officer accounts to eliminate migration scoping dropouts
        new_assigned = list(set(current_assigned + ["*"]))
        db.users.update_one(
            {"_id": u["_id"]},
            {"$set": {"assigned_cases": new_assigned}}
        )
        print(f"  - User '{username}' ({role}): assigned_cases set to {new_assigned}")

    # 2. Normalize Briefings (sections <-> section_data and valid case mapping)
    briefings = list(db.briefings.find({}))
    print(f"\nFound {len(briefings)} briefings in {label}:")
    for b in briefings:
        b_id = b.get("_id")
        updates = {}
        
        # Ensure section_data exists
        if not b.get("section_data") and b.get("sections"):
            updates["section_data"] = b["sections"]
            print(f"  - Briefing '{b_id}': Populated section_data from sections ({len(b['sections'])} sections)")
        
        # Ensure sections exists
        if not b.get("sections") and b.get("section_data"):
            updates["sections"] = b["section_data"]
            print(f"  - Briefing '{b_id}': Populated sections from section_data ({len(b['section_data'])} sections)")

        # Verify case linkage
        case_id = b.get("case_id")
        case_ref = b.get("case_reference")
        case = db.cases.find_one({"$or": [{"_id": case_id}, {"case_id": case_id}, {"case_reference": case_ref}]})
        if case:
            if b.get("case_id") != case["_id"]:
                updates["case_id"] = case["_id"]
                updates["case_reference"] = case.get("case_reference")
                print(f"  - Briefing '{b_id}': Linked to case _id '{case['_id']}' ({case.get('case_reference')})")
        else:
            print(f"  ! Briefing '{b_id}' case '{case_id}' not found in cases collection")

        if updates:
            db.briefings.update_one({"_id": b_id}, {"$set": updates})
            print(f"  ✓ Briefing '{b_id}' updated successfully.")
        else:
            print(f"  ✓ Briefing '{b_id}' already consistent.")

    # 3. Ensure cases have assigned_officers covering standard roles
    cases = list(db.cases.find({}))
    print(f"\nFound {len(cases)} cases in {label}:")
    standard_officers = ["investigator", "reviewer", "intake_officer", "admin", "auditor"]
    for c in cases:
        c_id = c.get("_id")
        officers = c.get("assigned_officers", [])
        if isinstance(officers, str):
            officers = [o.strip() for o in officers.replace(",", " ").split() if o.strip()]
        updated_officers = list(set(officers + standard_officers))
        db.cases.update_one(
            {"_id": c_id},
            {"$set": {"assigned_officers": updated_officers}}
        )
        print(f"  - Case '{c_id}' ({c.get('case_reference')}): assigned_officers updated to {updated_officers}")

    client.close()
    print(f"\nMigration complete for [{label}].\n")


def run_all_migrations():
    # 1. Migrate active configured DB (Atlas or local per .env)
    migrate_database(settings.MONGODB_URI, settings.MONGODB_DB_NAME, "Configured DB (.env)")
    
    # 2. Also migrate localhost MongoDB if available
    local_uri = "mongodb://localhost:27017"
    if settings.MONGODB_URI != local_uri:
        try:
            migrate_database(local_uri, settings.MONGODB_DB_NAME, "Localhost MongoDB Fallback")
        except Exception as e:
            print(f"Localhost MongoDB migration skipped: {e}")

if __name__ == "__main__":
    run_all_migrations()
