"""Strip credentials from logs and tool payloads. Never log tokens."""

from __future__ import annotations

import re
from typing import Any

SECRET_KEY_FRAGMENTS = (
    "app_key",
    "appkey",
    "app_secret",
    "appsecret",
    "secret",
    "token",
    "authorization",
    "password",
    "passwd",
    "pin",
    "did",
    "access_key",
    "private_key",
)

_REDACTED = "[redacted]"

# Matches common env-style assignments if they leak into a string.
_ASSIGNMENT_RE = re.compile(
    r"(?i)(WEBULL_(?:APP_KEY|APP_SECRET|TRADE_TOKEN)|authorization|bearer)\s*[:=]\s*\S+"
)


def is_secret_key(key: str) -> bool:
    lowered = key.lower().replace("-", "_")
    if lowered.endswith("_configured") or lowered.endswith("_set") or "configured" in lowered:
        return False
    return any(fragment == lowered or f"_{fragment}" in f"_{lowered}_" for fragment in SECRET_KEY_FRAGMENTS)


def redact_text(text: str) -> str:
    if not text:
        return text
    return _ASSIGNMENT_RE.sub(r"\1=[redacted]", text)


def redact(value: Any) -> Any:
    """Return a deep-copied structure with secret-looking fields masked."""
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for key, inner in value.items():
            if is_secret_key(str(key)):
                out[key] = _REDACTED
            else:
                out[key] = redact(inner)
        return out
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, tuple):
        return tuple(redact(item) for item in value)
    if isinstance(value, str):
        return redact_text(value)
    return value
