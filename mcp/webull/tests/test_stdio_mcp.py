"""Stdio MCP smoke: initialize, list tools, call mock quote + gated place."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

pytest.importorskip("mcp")

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from tortletech_webull_mcp.server import TOOL_NAMES

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"


def _server_params() -> StdioServerParameters:
    env = os.environ.copy()
    env["WEBULL_BACKEND"] = "mock"
    env["WEBULL_DRY_RUN"] = "true"
    env["WEBULL_CONFIRM_REQUIRED"] = "true"
    env["WEBULL_MAX_NOTIONAL_USD"] = "500"
    env["PYTHONPATH"] = os.pathsep.join(
        [str(SRC), env.get("PYTHONPATH", "")]
    ).rstrip(os.pathsep)
    # Drop secrets if a developer shell leaked them into CI.
    for key in list(env):
        if key.startswith("WEBULL_APP_") or "SECRET" in key or "TOKEN" in key:
            if key.startswith("WEBULL_") and key not in {
                "WEBULL_BACKEND",
                "WEBULL_DRY_RUN",
                "WEBULL_CONFIRM_REQUIRED",
                "WEBULL_MAX_NOTIONAL_USD",
                "WEBULL_PAPER",
                "WEBULL_REGION_ID",
                "WEBULL_ENVIRONMENT",
            }:
                env.pop(key, None)
    return StdioServerParameters(
        command=sys.executable,
        args=["-m", "tortletech_webull_mcp"],
        env=env,
        cwd=str(ROOT),
    )


def _text(result) -> str:
    parts = []
    for item in getattr(result, "content", []) or []:
        text = getattr(item, "text", None)
        if text:
            parts.append(text)
    return "\n".join(parts)


@pytest.mark.asyncio
async def test_stdio_tools_and_gates():
    async with stdio_client(_server_params()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            listed = await session.list_tools()
            names = {tool.name for tool in listed.tools}
            assert set(TOOL_NAMES) <= names

            auth = await session.call_tool("webull_auth_status", {})
            auth_text = _text(auth)
            assert "mock" in auth_text
            assert "TortleTech" in auth_text

            quote = await session.call_tool("webull_quote", {"symbol": "AAPL"})
            quote_text = _text(quote)
            assert "AAPL" in quote_text
            assert "MOCK" in quote_text or "mock" in quote_text

            blocked = await session.call_tool(
                "webull_place_order",
                {
                    "symbol": "AAPL",
                    "side": "BUY",
                    "quantity": 1,
                    "instrument": "stock",
                    "order_type": "LIMIT",
                    "limit_price": 10,
                    "confirm": False,
                },
            )
            blocked_text = _text(blocked)
            assert "confirm" in blocked_text.lower()

            dry = await session.call_tool(
                "webull_place_order",
                {
                    "symbol": "AAPL",
                    "side": "BUY",
                    "quantity": 1,
                    "instrument": "stock",
                    "order_type": "LIMIT",
                    "limit_price": 10,
                    "confirm": True,
                },
            )
            dry_text = _text(dry)
            assert "DRY_RUN" in dry_text
            compact = dry_text.replace(" ", "").replace("\n", "")
            assert '"filled_qty":0' in compact
