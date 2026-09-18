"""Stdio MCP server exposing gated Webull tools for TortleTech / @TORTLE420."""

from __future__ import annotations

import logging
import sys
from typing import Any

from mcp.server.fastmcp import FastMCP

from tortletech_webull_mcp.config import load_settings
from tortletech_webull_mcp.models import BackendError
from tortletech_webull_mcp.safety import SafetyError
from tortletech_webull_mcp.service import WebullService, error_payload

TOOL_NAMES = (
    "webull_auth_status",
    "webull_quote",
    "webull_option_chain",
    "webull_positions",
    "webull_orders",
    "webull_account",
    "webull_place_order",
    "webull_cancel_order",
    "webull_replace_order",
)

log = logging.getLogger("tortletech_webull_mcp")


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s"))
    root = logging.getLogger("tortletech_webull_mcp")
    if not root.handlers:
        root.addHandler(handler)
        root.setLevel(logging.INFO)
    logging.getLogger("mcp").setLevel(logging.WARNING)


def create_service(settings=None) -> WebullService:
    return WebullService(settings or load_settings())


def create_mcp(service: WebullService | None = None) -> FastMCP:
    configure_logging()
    svc = service or create_service()
    mcp = FastMCP(
        "tortletech-webull",
        instructions=(
            "TortleTech / @TORTLE420 Webull MCP. Cash-account style: single-leg long "
            "options only. Debit spreads often fail on cash and are rejected. "
            "webull_place_order requires confirm=true. Dry-run is on by default. "
            "Never treat mock/dry-run statuses as live fills."
        ),
    )

    def _call(fn, **kwargs: Any) -> dict[str, Any]:
        try:
            return fn(**kwargs)
        except (SafetyError, BackendError, ValueError, KeyError) as exc:
            log.info("tool error: %s", type(exc).__name__)
            return error_payload(exc)

    @mcp.tool(name="webull_auth_status")
    def webull_auth_status() -> dict[str, Any]:
        """Show backend mode, dry-run/paper flags, and whether live OpenAPI credentials are configured. Never returns secrets."""
        return _call(svc.auth_status)

    @mcp.tool(name="webull_quote")
    def webull_quote(symbol: str) -> dict[str, Any]:
        """Get a stock quote. Mock mode returns labeled MOCK prices; live mode uses OpenAPI snapshots."""
        return _call(svc.quote, symbol=symbol)

    @mcp.tool(name="webull_option_chain")
    def webull_option_chain(
        symbol: str,
        expiry: str | None = None,
        right: str | None = None,
    ) -> dict[str, Any]:
        """List option contracts for an underlying. Optional expiry (YYYY-MM-DD) and right (CALL/PUT)."""
        return _call(svc.option_chain, symbol=symbol, expiry=expiry, right=right)

    @mcp.tool(name="webull_positions")
    def webull_positions() -> dict[str, Any]:
        """List account positions (mock book or live OpenAPI)."""
        return _call(svc.positions)

    @mcp.tool(name="webull_orders")
    def webull_orders(status: str | None = None) -> dict[str, Any]:
        """List orders. Optional status filter such as OPEN or MOCK_OPEN."""
        return _call(svc.orders, status=status)

    @mcp.tool(name="webull_account")
    def webull_account() -> dict[str, Any]:
        """Account cash, buying power, and cash-account policy notes."""
        return _call(svc.account)

    @mcp.tool(name="webull_place_order")
    def webull_place_order(
        symbol: str,
        side: str,
        quantity: float,
        instrument: str = "stock",
        order_type: str = "LIMIT",
        limit_price: float | None = None,
        time_in_force: str = "DAY",
        option_type: str | None = None,
        strike: float | None = None,
        expiry: str | None = None,
        confirm: bool = False,
        client_order_id: str | None = None,
    ) -> dict[str, Any]:
        """Place a stock or single-leg option order. Gated: confirm=true required; dry-run by default; max-notional enforced. Multi-leg/debit spreads rejected."""
        return _call(
            svc.place_order,
            symbol=symbol,
            side=side,
            quantity=quantity,
            instrument=instrument,
            order_type=order_type,
            limit_price=limit_price,
            time_in_force=time_in_force,
            option_type=option_type,
            strike=strike,
            expiry=expiry,
            confirm=confirm,
            client_order_id=client_order_id,
        )

    @mcp.tool(name="webull_cancel_order")
    def webull_cancel_order(order_id: str, confirm: bool = False) -> dict[str, Any]:
        """Cancel an order by client_order_id. Requires confirm=true. Dry-run by default."""
        return _call(svc.cancel_order, order_id=order_id, confirm=confirm)

    @mcp.tool(name="webull_replace_order")
    def webull_replace_order(
        order_id: str,
        confirm: bool = False,
        quantity: float | None = None,
        limit_price: float | None = None,
    ) -> dict[str, Any]:
        """Replace quantity and/or limit_price on an open order. Requires confirm=true. Dry-run by default."""
        return _call(
            svc.replace_order,
            order_id=order_id,
            confirm=confirm,
            quantity=quantity,
            limit_price=limit_price,
        )

    return mcp


def registered_tool_names(mcp: FastMCP) -> set[str]:
    manager = getattr(mcp, "_tool_manager", None)
    if manager is None:
        return set()
    tools = getattr(manager, "_tools", None)
    if isinstance(tools, dict):
        return set(tools)
    listed = getattr(manager, "list_tools", None)
    if callable(listed):
        return {getattr(tool, "name", str(tool)) for tool in listed()}
    return set()


def main() -> None:
    configure_logging()
    log.info("starting TortleTech Webull MCP (stdio)")
    mcp = create_mcp()
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
