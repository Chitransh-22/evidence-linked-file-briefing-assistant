import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.db.mongodb import get_database
from app.core.logging import logger, sanitize_log_dict


def compute_event_hash(previous_hash: str, payload_str: str) -> str:
    combined = f"{previous_hash}|{payload_str}".encode("utf-8")
    return hashlib.sha256(combined).hexdigest()


class AuditService:
    @staticmethod
    async def log_event(
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        outcome: str = "SUCCESS",
        metadata: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
    ) -> str:
        """Append an audit record to the tamper-evident hash chain."""
        db = get_database()
        event_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        clean_metadata = sanitize_log_dict(metadata or {})

        # Fetch latest audit log to obtain previous_hash
        last_log = await db.audit_logs.find_one(sort=[("timestamp", -1)])
        previous_hash = last_log.get("event_hash", "0" * 64) if last_log else "0" * 64

        payload_content = {
            "event_id": event_id,
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "timestamp": timestamp,
            "outcome": outcome,
            "request_id": request_id or "",
            "metadata": clean_metadata,
        }
        canonical_str = json.dumps(payload_content, sort_keys=True)
        event_hash = compute_event_hash(previous_hash, canonical_str)

        audit_record = {
            "_id": event_id,
            "event_id": event_id,
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "timestamp": timestamp,
            "outcome": outcome,
            "request_id": request_id or "",
            "metadata": clean_metadata,
            "previous_hash": previous_hash,
            "event_hash": event_hash,
        }

        await db.audit_logs.insert_one(audit_record)
        return event_id

    @staticmethod
    async def verify_chain_integrity() -> Dict[str, Any]:
        """Verify the cryptographic integrity of the entire audit trail."""
        db = get_database()
        cursor = db.audit_logs.find().sort("timestamp", 1)
        logs = await cursor.to_list(length=10000)

        if not logs:
            return {"valid": True, "total_records": 0, "message": "Audit chain is empty."}

        expected_prev_hash = "0" * 64
        for idx, record in enumerate(logs):
            actual_prev_hash = record.get("previous_hash")
            if actual_prev_hash != expected_prev_hash:
                return {
                    "valid": False,
                    "tampered_at_index": idx,
                    "event_id": record.get("event_id"),
                    "message": f"Hash chain broken at event {record.get('event_id')}: expected prev {expected_prev_hash}, got {actual_prev_hash}",
                }

            payload_content = {
                "event_id": record["event_id"],
                "user_id": record["user_id"],
                "action": record["action"],
                "resource_type": record["resource_type"],
                "resource_id": record["resource_id"],
                "timestamp": record["timestamp"],
                "outcome": record["outcome"],
                "request_id": record.get("request_id", ""),
                "metadata": record.get("metadata", {}),
            }
            canonical_str = json.dumps(payload_content, sort_keys=True)
            recomputed_hash = compute_event_hash(actual_prev_hash, canonical_str)

            if recomputed_hash != record.get("event_hash"):
                return {
                    "valid": False,
                    "tampered_at_index": idx,
                    "event_id": record.get("event_id"),
                    "message": f"Event hash mismatch at event {record.get('event_id')}",
                }

            expected_prev_hash = record.get("event_hash")

        return {
            "valid": True,
            "total_records": len(logs),
            "head_hash": expected_prev_hash,
            "message": "Audit chain integrity verified. Zero tampering detected.",
        }
