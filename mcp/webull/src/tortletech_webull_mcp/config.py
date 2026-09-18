"""Environment-only configuration. Secrets never go in source or logs."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from tortletech_webull_mcp.redact import is_secret_key


def _truthy(raw: str | None, default: bool) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def load_env_file(path: Path) -> None:
    """Load KEY=VALUE pairs without overriding existing process env.

    Values are never printed. Only WEBULL_* keys are accepted.
    """
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        key = key.strip()
        if not key.startswith("WEBULL_"):
            continue
        if key in os.environ:
            continue
        os.environ[key] = value.strip().strip('"').strip("'")


def discover_and_load_dotenv() -> None:
    here = Path(__file__).resolve()
    candidates = [
        Path.cwd() / ".env",
        here.parents[2] / ".env",  # mcp/webull/.env when installed from src
        here.parents[3] / ".env" if len(here.parents) > 3 else Path("/dev/null"),
    ]
    seen: set[Path] = set()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            continue
        if resolved in seen:
            continue
        seen.add(resolved)
        load_env_file(resolved)


@dataclass(frozen=True)
class Settings:
    backend: str
    dry_run: bool
    paper: bool
    confirm_required: bool
    max_notional_usd: float
    app_key: str
    app_secret: str
    account_id: str
    region_id: str
    environment: str
    token_dir: str

    @property
    def live_requested(self) -> bool:
        return self.backend == "live"

    @property
    def has_live_credentials(self) -> bool:
        return bool(self.app_key and self.app_secret)

    @property
    def api_host(self) -> str:
        region = self.region_id.lower()
        use_sandbox = self.paper or self.environment.lower() in {"sandbox", "paper", "test"}
        if region == "us":
            return "api.sandbox.webull.com" if use_sandbox else "api.webull.com"
        # Documented regional hosts live in the official SDK/docs; default to US.
        return "api.sandbox.webull.com" if use_sandbox else "api.webull.com"

    def public_dict(self) -> dict[str, object]:
        """Safe summary for auth_status — no secrets."""
        return {
            "backend": self.backend,
            "dry_run": self.dry_run,
            "paper": self.paper,
            "confirm_required": self.confirm_required,
            "max_notional_usd": self.max_notional_usd,
            "region_id": self.region_id,
            "environment": self.environment,
            "api_host": self.api_host,
            "account_id_configured": bool(self.account_id),
            "app_key_configured": bool(self.app_key),
            "app_secret_configured": bool(self.app_secret),
            "live_ready": self.live_requested and self.has_live_credentials,
        }


def load_settings() -> Settings:
    discover_and_load_dotenv()
    backend = os.environ.get("WEBULL_BACKEND", "mock").strip().lower() or "mock"
    if backend not in {"mock", "live"}:
        raise ValueError("WEBULL_BACKEND must be 'mock' or 'live'")
    environment = os.environ.get("WEBULL_ENVIRONMENT", "sandbox").strip().lower() or "sandbox"
    max_notional = float(os.environ.get("WEBULL_MAX_NOTIONAL_USD", "500"))
    if max_notional <= 0:
        raise ValueError("WEBULL_MAX_NOTIONAL_USD must be positive")
    return Settings(
        backend=backend,
        dry_run=_truthy(os.environ.get("WEBULL_DRY_RUN"), True),
        paper=_truthy(os.environ.get("WEBULL_PAPER"), True),
        confirm_required=_truthy(os.environ.get("WEBULL_CONFIRM_REQUIRED"), True),
        max_notional_usd=max_notional,
        app_key=os.environ.get("WEBULL_APP_KEY", "").strip(),
        app_secret=os.environ.get("WEBULL_APP_SECRET", "").strip(),
        account_id=os.environ.get("WEBULL_ACCOUNT_ID", "").strip(),
        region_id=os.environ.get("WEBULL_REGION_ID", "us").strip() or "us",
        environment=environment,
        token_dir=os.environ.get("WEBULL_OPENAPI_TOKEN_DIR", "").strip(),
    )


def assert_no_secret_in_mapping(payload: dict[str, object]) -> None:
    """Test helper / runtime guard: public payloads must not include secret keys."""
    for key in payload:
        if is_secret_key(str(key)):
            raise RuntimeError(f"refusing to expose secret-looking key: {key}")
