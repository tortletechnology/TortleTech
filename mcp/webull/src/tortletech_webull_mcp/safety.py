"""Cash-account trading gates: confirm, dry-run, max-notional, single-leg only."""

from __future__ import annotations

from tortletech_webull_mcp.config import Settings
from tortletech_webull_mcp.models import (
    BackendError,
    Order,
    OrderResult,
    PlaceOrderRequest,
    Position,
)

CASH_ACCOUNT_NOTE = (
    "Cash-account style: long stock and single-leg long options (buy-to-open calls/puts) "
    "are in scope. Debit spreads and other multi-leg strategies are rejected here because "
    "they often fail on cash accounts even when the OpenAPI accepts the payload. "
    "Naked / uncovered short options are rejected."
)


class SafetyError(BackendError):
    """Operator-facing gate failure (not a broker reject)."""


def estimate_notional(request: PlaceOrderRequest, fallback_price: float | None) -> float:
    price = request.limit_price if request.limit_price is not None else fallback_price
    if price is None:
        raise SafetyError(
            "Need limit_price (or a quote) to enforce WEBULL_MAX_NOTIONAL_USD. "
            "Use a LIMIT order or fetch webull_quote first."
        )
    if price <= 0:
        raise SafetyError("Price must be positive for notional checks.")
    return abs(request.quantity * price * request.multiplier())


def validate_place_request(
    request: PlaceOrderRequest,
    settings: Settings,
    positions: list[Position],
    fallback_price: float | None,
) -> float:
    if settings.confirm_required and not request.confirm:
        raise SafetyError(
            "webull_place_order is gated. Pass confirm=true after the operator reviews "
            "the ticket. Set WEBULL_CONFIRM_REQUIRED=false only for automated tests."
        )
    if request.quantity <= 0:
        raise SafetyError("quantity must be > 0")
    instrument = request.instrument.lower().strip()
    if instrument not in {"stock", "option"}:
        raise SafetyError("instrument must be 'stock' or 'option'")
    request.instrument = instrument
    side = request.side.upper().strip()
    if side not in {"BUY", "SELL"}:
        raise SafetyError("side must be BUY or SELL")
    request.side = side
    order_type = request.order_type.upper().strip()
    if order_type not in {"MARKET", "LIMIT"}:
        raise SafetyError("order_type must be MARKET or LIMIT")
    request.order_type = order_type
    if request.extra_legs:
        raise SafetyError(
            "Multi-leg tickets are disabled. "
            + CASH_ACCOUNT_NOTE
        )
    tif = (request.time_in_force or "DAY").upper()
    if tif not in {"DAY", "GTC"}:
        raise SafetyError("time_in_force must be DAY or GTC")
    request.time_in_force = tif

    if instrument == "option":
        if order_type == "MARKET":
            raise SafetyError("Webull OpenAPI does not support MARKET option orders. Use LIMIT.")
        if request.limit_price is None:
            raise SafetyError("Option orders require limit_price.")
        if not request.option_type or request.option_type.upper() not in {"CALL", "PUT"}:
            raise SafetyError("Option orders require option_type CALL or PUT.")
        request.option_type = request.option_type.upper()
        if request.strike is None or request.strike <= 0:
            raise SafetyError("Option orders require a positive strike.")
        if not request.expiry:
            raise SafetyError("Option orders require expiry (YYYY-MM-DD).")
        if side == "SELL" and not _closes_long_option(request, positions):
            raise SafetyError(
                "Cash-account gate: sell-to-open / uncovered short options are blocked. "
                "Sell is allowed only to close a matching long option position. "
                + CASH_ACCOUNT_NOTE
            )
    else:
        if order_type == "LIMIT" and request.limit_price is None:
            raise SafetyError("LIMIT stock orders require limit_price.")
        if side == "SELL" and not _closes_long_stock(request, positions):
            raise SafetyError(
                "Cash-account gate: short stock is blocked. SELL is allowed only against "
                "an existing long stock position in this account snapshot."
            )

    notional = estimate_notional(request, fallback_price)
    if notional > settings.max_notional_usd:
        raise SafetyError(
            f"Estimated notional ${notional:.2f} exceeds WEBULL_MAX_NOTIONAL_USD="
            f"{settings.max_notional_usd:.2f}."
        )
    return notional


def _closes_long_stock(request: PlaceOrderRequest, positions: list[Position]) -> bool:
    symbol = request.symbol.upper()
    long_qty = sum(
        pos.quantity
        for pos in positions
        if pos.instrument == "stock" and pos.symbol.upper() == symbol and pos.quantity > 0
    )
    return long_qty >= request.quantity


def _closes_long_option(request: PlaceOrderRequest, positions: list[Position]) -> bool:
    symbol = request.symbol.upper()
    for pos in positions:
        if pos.instrument != "option" or pos.quantity <= 0:
            continue
        if pos.symbol.upper() != symbol:
            continue
        if pos.quantity < request.quantity:
            continue
        # Mock positions store OCC on occ_symbol; live payloads may only have symbol.
        if pos.occ_symbol and request.expiry and request.option_type and request.strike is not None:
            right = request.option_type[0].upper()
            needle = f"{right}"
            if needle in pos.occ_symbol.upper() and request.expiry.replace("-", "")[2:] in pos.occ_symbol:
                return True
            # Fall through to quantity+symbol match when OCC encoding is unknown.
        return True
    return False


def dry_run_result(request: PlaceOrderRequest, notional: float) -> OrderResult:
    preview = Order(
        order_id="dry-run",
        client_order_id="dry-run",
        symbol=request.symbol.upper(),
        instrument=request.instrument,
        side=request.side,
        quantity=request.quantity,
        order_type=request.order_type,
        limit_price=request.limit_price,
        status="DRY_RUN",
        filled_qty=0.0,
        note="Dry-run: no broker call. Set WEBULL_DRY_RUN=false to submit.",
        option_type=request.option_type,
        strike=request.strike,
        expiry=request.expiry,
    )
    return OrderResult(
        accepted=True,
        status="DRY_RUN",
        order=preview,
        message=preview.note + " " + CASH_ACCOUNT_NOTE,
        dry_run=True,
        live=False,
        estimated_notional=notional,
    )


def validate_mutate(confirm: bool, settings: Settings, action: str) -> None:
    if settings.confirm_required and not confirm:
        raise SafetyError(
            f"{action} is gated. Pass confirm=true. "
            "Set WEBULL_CONFIRM_REQUIRED=false only for automated tests."
        )
