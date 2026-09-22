"""Pytest fixtures."""

from __future__ import annotations

import os

import pytest

from tortletech_webull_mcp.config import Settings
from tortletech_webull_mcp.service import WebullService


def mock_settings(**overrides) -> Settings:
    values = dict(
        backend="mock",
        dry_run=True,
        paper=True,
        confirm_required=True,
        max_notional_usd=500.0,
        app_key="",
        app_secret="",
        account_id="",
        region_id="us",
        environment="sandbox",
        token_dir="",
    )
    values.update(overrides)
    return Settings(**values)


@pytest.fixture
def settings() -> Settings:
    return mock_settings()


@pytest.fixture
def service(settings: Settings) -> WebullService:
    return WebullService(settings)


@pytest.fixture
def live_ish_env(monkeypatch):
    monkeypatch.setenv("WEBULL_BACKEND", "mock")
    monkeypatch.setenv("WEBULL_DRY_RUN", "true")
    monkeypatch.delenv("WEBULL_APP_KEY", raising=False)
    monkeypatch.delenv("WEBULL_APP_SECRET", raising=False)
    return os.environ
