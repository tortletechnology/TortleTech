"""Backend factory."""

from __future__ import annotations

from tortletech_webull_mcp.backend.base import WebullBackend
from tortletech_webull_mcp.config import Settings


def build_backend(settings: Settings) -> WebullBackend:
    if settings.backend == "mock":
        from tortletech_webull_mcp.backend.mock import MockBackend

        return MockBackend(settings)
    if settings.backend == "live":
        from tortletech_webull_mcp.backend.live import LiveBackend

        return LiveBackend(settings)
    raise ValueError(f"unknown backend: {settings.backend}")
