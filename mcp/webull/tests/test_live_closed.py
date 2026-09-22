"""Live backend must fail closed without SDK/credentials — no fake fills."""

import pytest

from tortletech_webull_mcp.backend.live import LiveBackend
from tortletech_webull_mcp.config import Settings
from tortletech_webull_mcp.models import BackendError
from tortletech_webull_mcp.service import WebullService


def test_live_without_credentials():
    settings = Settings(
        backend="live",
        dry_run=True,
        paper=True,
        confirm_required=True,
        max_notional_usd=500,
        app_key="",
        app_secret="",
        account_id="",
        region_id="us",
        environment="sandbox",
        token_dir="",
    )
    backend = LiveBackend(settings)
    with pytest.raises(BackendError, match="WEBULL_APP_KEY"):
        backend.quote("AAPL")
    status = backend.auth_status()
    assert status["ok"] is False
    assert "WEBULL_APP_KEY" in str(status["error"])


def test_live_without_sdk_mentions_extra(monkeypatch):
    settings = Settings(
        backend="live",
        dry_run=True,
        paper=True,
        confirm_required=True,
        max_notional_usd=500,
        app_key="key",
        app_secret="secret",
        account_id="acc",
        region_id="us",
        environment="sandbox",
        token_dir="",
    )
    import builtins

    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name.startswith("webull"):
            raise ImportError("simulated missing sdk")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    backend = LiveBackend(settings)
    with pytest.raises(BackendError, match="live extra"):
        backend.account()


def test_service_live_auth_status_without_creds():
    settings = Settings(
        backend="live",
        dry_run=True,
        paper=True,
        confirm_required=True,
        max_notional_usd=500,
        app_key="",
        app_secret="",
        account_id="",
        region_id="us",
        environment="sandbox",
        token_dir="",
    )
    status = WebullService(settings).auth_status()
    assert status["ok"] is False
    assert "WEBULL_APP_KEY" in status["error"]
    blob = str(status)
    assert "super-secret" not in blob
    assert status["settings"]["app_secret_configured"] is False
