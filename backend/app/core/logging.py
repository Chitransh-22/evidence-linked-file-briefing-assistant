import logging
import sys
from typing import Any, Dict


def setup_logging():
    log_format = "%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )
    # Suppress verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("pymongo").setLevel(logging.WARNING)


logger = logging.getLogger("gov_evidence_system")


def sanitize_log_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Strip sensitive fields such as passwords, tokens, full confidential text from logs."""
    sensitive_keys = {"password", "token", "secret", "authorization", "api_key", "password_hash"}
    cleaned = {}
    for k, v in data.items():
        if any(sens in k.lower() for sens in sensitive_keys):
            cleaned[k] = "[REDACTED]"
        elif isinstance(v, dict):
            cleaned[k] = sanitize_log_dict(v)
        else:
            cleaned[k] = v
    return cleaned
