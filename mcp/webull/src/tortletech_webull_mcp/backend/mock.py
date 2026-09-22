"""Deterministic mock backend for CI and Cursor dry runs.

Quotes, chains, and fills here are labeled MOCK. They are not live market data
and must never be described as broker fills.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta

from tortletech_webull_mcp.config import Settings
from tortletech_webull_mcp.models import (
    AccountSnapshot,
    OptionContract,
    Order,
    OrderResult,
    PlaceOrderRequest,
    Position,
    Quote,
)

MOCK_NOTE = (
    "MOCK data only — not a live Webull quote, fill, or account. "
    "Set WEBULL_BACKEND=live with OpenAPI credentials to wire the official API."
)


def _next_friday(from_day: date | None = None) -> date:
    day = from_day or date(2026, 9, 18)
    return day + timedelta(days=(4 - day.weekday()) % 7)


def _occ(symbol: str, expiry: date, right: str, strike: float) -> str:
    return f"{symbol}{expiry.strftime('%y%m%d')}{right[0]}{int(strike * 1000):08d}"


class MockBackend:
    name = "mock"

    def __init__(self, settings: Settings):
        self.settings = settings
        self._quotes = {
            "AAPL": Quote("AAPL", 189.50, 189.40, 189.60, 42_000_000, "mock", MOCK_NOTE),
            "SPY": Quote("SPY", 560.10, 560.00, 560.20, 80_000_000, "mock", MOCK_NOTE),
            "TSLA": Quote("TSLA", 241.00, 240.80, 241.20, 55_000_000, "mock", MOCK_NOTE),
        }
        expiry = _next_friday()
        self._chain: list[OptionContract] = []
        for symbol, last in (("AAPL", 189.50), ("SPY", 560.10), ("TSLA", 241.00)):
            for right in ("CALL", "PUT"):
                for strike in (round(last - 5, 2), round(last, 2), round(last + 5, 2)):
                    mid = 3.25 if right == "CALL" else 2.80
                    occ = _occ(symbol, expiry, right, strike)
                    self._chain.append(
                        OptionContract(
                            symbol=symbol,
                            underlying=symbol,
                            expiry=expiry.isoformat(),
                            strike=float(strike),
                            right=right,
                            bid=round(mid - 0.05, 2),
                            ask=round(mid + 0.05, 2),
                            last=mid,
                            occ_symbol=occ,
                        )
                    )
        self._positions = [
            Position("AAPL", "stock", 10, 180.0, 1895.0, "LONG"),
            Position(
                "AAPL",
                "option",
                1,
                3.10,
                325.0,
                "LONG",
                occ_symbol=_occ("AAPL", expiry, "CALL", 190.0),
            ),
        ]
        self._orders: list[Order] = [
            Order(
                order_id="mock-open-1",
                client_order_id="mock-open-1",
                symbol="SPY",
                instrument="stock",
                side="BUY",
                quantity=1,
                order_type="LIMIT",
                limit_price=555.0,
                status="MOCK_OPEN",
                filled_qty=0,
                note=MOCK_NOTE,
            )
        ]
        self._account = AccountSnapshot(
            account_id=settings.account_id or "MOCK-CASH-001",
            account_type="CASH",
            cash=10_000.0,
            buying_power=10_000.0,
            currency="USD",
            source="mock",
            note=MOCK_NOTE,
        )

    def auth_status(self) -> dict[str, object]:
        return {
            "ok": True,
            "backend": "mock",
            "authenticated": True,
            "mode": "mock",
            "note": MOCK_NOTE,
            "settings": self.settings.public_dict(),
        }

    def quote(self, symbol: str) -> Quote:
        key = symbol.upper().strip()
        if key not in self._quotes:
            raise KeyError(f"mock backend has no quote for {key}; known: {sorted(self._quotes)}")
        return self._quotes[key]

    def option_chain(
        self,
        symbol: str,
        expiry: str | None = None,
        right: str | None = None,
    ) -> list[OptionContract]:
        key = symbol.upper().strip()
        contracts = [c for c in self._chain if c.underlying == key]
        if expiry:
            contracts = [c for c in contracts if c.expiry == expiry]
        if right:
            contracts = [c for c in contracts if c.right.upper() == right.upper()]
        if not contracts:
            raise KeyError(f"mock option chain empty for {key} expiry={expiry} right={right}")
        return contracts

    def positions(self) -> list[Position]:
        return list(self._positions)

    def orders(self, status: str | None = None) -> list[Order]:
        if not status:
            return list(self._orders)
        wanted = status.upper()
        return [order for order in self._orders if order.status.upper() == wanted]

    def account(self) -> AccountSnapshot:
        return self._account

    def place_order(self, request: PlaceOrderRequest) -> OrderResult:
        order_id = request.client_order_id or f"mock-{uuid.uuid4().hex[:12]}"
        order = Order(
            order_id=order_id,
            client_order_id=order_id,
            symbol=request.symbol.upper(),
            instrument=request.instrument,
            side=request.side.upper(),
            quantity=request.quantity,
            order_type=request.order_type.upper(),
            limit_price=request.limit_price,
            status="MOCK_ACCEPTED",
            filled_qty=0.0,
            note=MOCK_NOTE + " Order parked in-memory; not routed to Webull.",
            option_type=request.option_type,
            strike=request.strike,
            expiry=request.expiry,
        )
        self._orders.append(order)
        return OrderResult(
            accepted=True,
            status="MOCK_ACCEPTED",
            order=order,
            message=order.note,
            dry_run=False,
            live=False,
            estimated_notional=request.estimated_notional(
                fallback_price=self._fallback_price(request)
            ),
        )

    def cancel_order(self, order_id: str) -> OrderResult:
        for order in self._orders:
            if order.order_id == order_id or order.client_order_id == order_id:
                if order.status in {"MOCK_CANCELLED", "CANCELLED"}:
                    return OrderResult(
                        False,
                        order.status,
                        order,
                        "Order already cancelled.",
                        False,
                        False,
                    )
                order.status = "MOCK_CANCELLED"
                order.note = MOCK_NOTE + " Cancelled in mock book only."
                return OrderResult(True, "MOCK_CANCELLED", order, order.note, False, False)
        return OrderResult(False, "NOT_FOUND", None, f"No mock order {order_id}", False, False)

    def replace_order(
        self,
        order_id: str,
        quantity: float | None,
        limit_price: float | None,
    ) -> OrderResult:
        for order in self._orders:
            if order.order_id == order_id or order.client_order_id == order_id:
                if order.status not in {"MOCK_OPEN", "MOCK_ACCEPTED"}:
                    return OrderResult(
                        False,
                        order.status,
                        order,
                        "Only open mock orders can be replaced.",
                        False,
                        False,
                    )
                if quantity is not None:
                    order.quantity = quantity
                if limit_price is not None:
                    order.limit_price = limit_price
                order.status = "MOCK_REPLACED"
                order.note = MOCK_NOTE + " Replaced in mock book only."
                return OrderResult(True, "MOCK_REPLACED", order, order.note, False, False)
        return OrderResult(False, "NOT_FOUND", None, f"No mock order {order_id}", False, False)

    def _fallback_price(self, request: PlaceOrderRequest) -> float | None:
        if request.limit_price is not None:
            return request.limit_price
        try:
            quote = self.quote(request.symbol)
        except KeyError:
            return None
        return quote.ask if request.side.upper() == "BUY" else quote.bid
