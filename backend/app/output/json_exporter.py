import json
from datetime import datetime, timezone


def export_json(payload: dict) -> str:
    envelope = {
        "format": "whitespace.session.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data": payload,
    }
    return json.dumps(envelope, indent=2)
