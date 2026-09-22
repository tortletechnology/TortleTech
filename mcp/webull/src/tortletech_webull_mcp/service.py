"""Tool implementations shared by the MCP server and tests."""

from __future__ import annotations

from typing import Any

from tortletech_webull_mcp.backend import build_backend
from tortletech_webull_mcp.config import Settings
from tortletech_webull_mcp.models import BackendError, PlaceOrderRequest
from tortletech_webull_mcp.redact import redact
from tortletech_webull_mcp.safety import (
    CASH_ACCOUNT_NOTE,
    SafetyError,
    dry_run_result,
    validate_mutate,
    validate_place_request,
)


class WebullService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.backend = build_backend(settings)

    def auth_status(self) -> dict[str, Any]:
        try:
            payload = self.backend.auth_status()
        except BackendError as exc:
            payload = {
                "ok": False,
                "backend": self.backend.name,
                "authenticated": False,
                "error": str(exc),
                "settings": self.settings.public_dict(),
            }
        payload.setdefault("brand", "TortleTech / @TORTLE420")
        payload.setdefault("cash_account_policy", CASH_ACCOUNT_NOTE)
        return redact(payload)

    def quote(self, symbol: str) -> dict[str, Any]:
        if not symbol or not symbol.strip():
            raise BackendError("symbol is required")
        return redact({"ok": True, **self.backend.quote(symbol.strip()).as_dict()})

    def option_chain(
        self,
        symbol: str,
        expiry: str | None = None,
        right: str | None = None,
    ) -> dict[str, Any]:
        if not symbol or not symbol.strip():
            raise BackendError("symbol is required")
        contracts = self.backend.option_chain(symbol.strip(), expiry, right)
        return redact(
            {
                "ok": True,
                "symbol": symbol.upper().strip(),
                "source": self.backend.name,
                "count": len(contracts),
                "contracts": [c.as_dict() for c in contracts],
                "note": (
                    "Mock chains are labeled mock. Live chains pass through OpenAPI contracts "
                    "without inventing quotes."
                    if self.backend.name == "live"
                    else "MOCK option chain — not live OPRA data."
                ),
            }
        )

    def positions(self) -> dict[str, Any]:
        rows = self.backend.positions()
        return redact(
            {
                "ok": True,
                "source": self.backend.name,
                "count": len(rows),
                "positions": [p.as_dict() for p in rows],
            }
        )

    def orders(self, status: str | None = None) -> dict[str, Any]:
        rows = self.backend.orders(status)
        return redact(
            {
                "ok": True,
                "source": self.backend.name,
                "count": len(rows),
                "orders": [o.as_dict() for o in rows],
            }
        )

    def account(self) -> dict[str, Any]:
        snap = self.backend.account()
        return redact({"ok": True, **snap.as_dict(), "cash_account_policy": CASH_ACCOUNT_NOTE})

    def place_order(self, **kwargs: Any) -> dict[str, Any]:
        request = _place_request_from_kwargs(kwargs)
        fallback = None
        try:
            fallback = self.backend.quote(request.symbol).last
        except Exception:
            fallback = None
        try:
            positions = self.backend.positions()
        except Exception:
            positions = []
        notional = validate_place_request(request, self.settings, positions, fallback)
        if self.settings.dry_run:
            result = dry_run_result(request, notional)
            payload = result.as_dict()
            payload["ok"] = True
            payload["gated"] = True
            payload["cash_account_policy"] = CASH_ACCOUNT_NOTE
            return redact(payload)
        result = self.backend.place_order(request)
        payload = result.as_dict()
        payload["ok"] = result.accepted
        payload["gated"] = False
        payload["cash_account_policy"] = CASH_ACCOUNT_NOTE
        return redact(payload)

    def cancel_order(self, order_id: str, confirm: bool = False) -> dict[str, Any]:
        if not order_id:
            raise SafetyError("order_id is required")
        validate_mutate(confirm, self.settings, "webull_cancel_order")
        if self.settings.dry_run:
            return redact(
                {
                    "ok": True,
                    "status": "DRY_RUN",
                    "dry_run": True,
                    "live": False,
                    "order_id": order_id,
                    "message": "Dry-run: cancel not sent to Webull.",
                }
            )
        result = self.backend.cancel_order(order_id)
        payload = result.as_dict()
        payload["ok"] = result.accepted
        return redact(payload)

    def replace_order(
        self,
        order_id: str,
        confirm: bool = False,
        quantity: float | None = None,
        limit_price: float | None = None,
    ) -> dict[str, Any]:
        if not order_id:
            raise SafetyError("order_id is required")
        if quantity is None and limit_price is None:
            raise SafetyError("replace requires quantity and/or limit_price")
        validate_mutate(confirm, self.settings, "webull_replace_order")
        if self.settings.dry_run:
            return redact(
                {
                    "ok": True,
                    "status": "DRY_RUN",
                    "dry_run": True,
                    "live": False,
                    "order_id": order_id,
                    "quantity": quantity,
                    "limit_price": limit_price,
                    "message": "Dry-run: replace not sent to Webull.",
                }
            )
        result = self.backend.replace_order(order_id, quantity, limit_price)
        payload = result.as_dict()
        payload["ok"] = result.accepted
        return redact(payload)


def _place_request_from_kwargs(kwargs: dict[str, Any]) -> PlaceOrderRequest:
    extra = kwargs.get("legs") or kwargs.get("extra_legs") or []
    return PlaceOrderRequest(
        instrument=str(kwargs.get("instrument") or "stock"),
        symbol=str(kwargs.get("symbol") or "").upper().strip(),
        side=str(kwargs.get("side") or ""),
        quantity=float(kwargs.get("quantity") or 0),
        order_type=str(kwargs.get("order_type") or "LIMIT"),
        confirm=bool(kwargs.get("confirm")),
        limit_price=_optional_float(kwargs.get("limit_price")),
        time_in_force=str(kwargs.get("time_in_force") or "DAY"),
        option_type=(str(kwargs["option_type"]).upper() if kwargs.get("option_type") else None),
        strike=_optional_float(kwargs.get("strike")),
        expiry=str(kwargs["expiry"]) if kwargs.get("expiry") else None,
        client_order_id=str(kwargs["client_order_id"]) if kwargs.get("client_order_id") else None,
        extra_legs=list(extra) if extra else [],
    )


def _optional_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    return float(value)


def error_payload(exc: Exception) -> dict[str, Any]:
    return redact(
        {
            "ok": False,
            "error": type(exc).__name__,
            "message": str(exc),
        }
    )
