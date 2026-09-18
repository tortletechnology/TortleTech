"""Shared shapes for mock and live backends."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal, Protocol

InstrumentKind = Literal["stock", "option"]
Side = Literal["BUY", "SELL"]
OrderType = Literal["MARKET", "LIMIT"]
OptionRight = Literal["CALL", "PUT"]


@dataclass
class Quote:
    symbol: str
    last: float
    bid: float
    ask: float
    volume: int
    source: str
    note: str = ""

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class OptionContract:
    symbol: str
    underlying: str
    expiry: str
    strike: float
    right: str
    bid: float
    ask: float
    last: float
    occ_symbol: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Position:
    symbol: str
    instrument: str
    quantity: float
    average_price: float
    market_value: float
    side: str = "LONG"
    occ_symbol: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Order:
    order_id: str
    client_order_id: str
    symbol: str
    instrument: str
    side: str
    quantity: float
    order_type: str
    limit_price: float | None
    status: str
    filled_qty: float = 0.0
    note: str = ""
    option_type: str | None = None
    strike: float | None = None
    expiry: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AccountSnapshot:
    account_id: str
    account_type: str
    cash: float
    buying_power: float
    currency: str
    source: str
    note: str = ""

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PlaceOrderRequest:
    instrument: str
    symbol: str
    side: str
    quantity: float
    order_type: str
    confirm: bool
    limit_price: float | None = None
    time_in_force: str = "DAY"
    option_type: str | None = None
    strike: float | None = None
    expiry: str | None = None
    client_order_id: str | None = None
    extra_legs: list[dict[str, Any]] = field(default_factory=list)

    def multiplier(self) -> int:
        return 100 if self.instrument == "option" else 1

    def estimated_notional(self, fallback_price: float | None = None) -> float:
        price = self.limit_price if self.limit_price is not None else fallback_price
        if price is None:
            raise ValueError("limit_price is required to estimate notional for this order")
        return abs(self.quantity * price * self.multiplier())


@dataclass
class OrderResult:
    accepted: bool
    status: str
    order: Order | None
    message: str
    dry_run: bool
    live: bool
    estimated_notional: float | None = None
    raw: dict[str, Any] | None = None

    def as_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "accepted": self.accepted,
            "status": self.status,
            "order": self.order.as_dict() if self.order else None,
            "message": self.message,
            "dry_run": self.dry_run,
            "live": self.live,
            "estimated_notional": self.estimated_notional,
        }
        if self.raw is not None:
            payload["broker_response"] = self.raw
        return payload


class BackendError(RuntimeError):
    """Backend refused or failed a call. Message is safe to return to the client."""


class WebullBackend(Protocol):
    name: str

    def auth_status(self) -> dict[str, Any]: ...

    def quote(self, symbol: str) -> Quote: ...

    def option_chain(
        self,
        symbol: str,
        expiry: str | None = None,
        right: str | None = None,
    ) -> list[OptionContract]: ...

    def positions(self) -> list[Position]: ...

    def orders(self, status: str | None = None) -> list[Order]: ...

    def account(self) -> AccountSnapshot: ...

    def place_order(self, request: PlaceOrderRequest) -> OrderResult: ...

    def cancel_order(self, order_id: str) -> OrderResult: ...

    def replace_order(
        self,
        order_id: str,
        quantity: float | None,
        limit_price: float | None,
    ) -> OrderResult: ...
