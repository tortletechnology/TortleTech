"""Official Webull OpenAPI live-wire.

Requires `pip install 'tortletech-webull-mcp[live]'` and WEBULL_APP_KEY / WEBULL_APP_SECRET.

This adapter does not synthesize fills. Broker JSON is passed through after redaction.
SDK stdout/file loggers are disabled so MCP stdio stays clean and tokens stay out of logs.
"""

from __future__ import annotations

import uuid
from typing import Any

from tortletech_webull_mcp.config import Settings
from tortletech_webull_mcp.models import (
    AccountSnapshot,
    BackendError,
    OptionContract,
    Order,
    OrderResult,
    PlaceOrderRequest,
    Position,
    Quote,
)
from tortletech_webull_mcp.redact import redact


def _silence_sdk_loggers(api_client: Any) -> None:
    """TradeClient.__init__ writes to stdout + webull_trade_sdk.log unless these flags are set."""
    api_client._stream_logger_set = True
    api_client._file_logger_set = True


def _response_payload(res: Any) -> Any:
    if hasattr(res, "json"):
        try:
            return res.json()
        except Exception:
            return {"text": redact(getattr(res, "text", "")[:500])}
    return res


def _require_ok(res: Any, action: str) -> Any:
    code = getattr(res, "status_code", None)
    payload = redact(_response_payload(res))
    if code is not None and int(code) != 200:
        raise BackendError(f"{action} failed (HTTP {code}): {payload}")
    return payload


def _as_list(payload: Any, *keys: str) -> list[Any]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in keys:
            value = payload.get(key)
            if isinstance(value, list):
                return value
        if "data" in payload:
            return _as_list(payload["data"], *keys)
    return [payload]


class LiveBackend:
    name = "live"

    def __init__(self, settings: Settings):
        self.settings = settings
        self._error: BackendError | None = None
        self._trade = None
        self._data = None
        self._account_id = settings.account_id
        if not settings.has_live_credentials:
            self._error = BackendError(
                "Live backend needs WEBULL_APP_KEY and WEBULL_APP_SECRET from "
                "https://www.webull.com/center#openApiManagement (OpenAPI application). "
                "Keep WEBULL_BACKEND=mock until credentials exist."
            )
            return
        try:
            from webull.core.client import ApiClient
            from webull.data.data_client import DataClient
            from webull.trade.trade_client import TradeClient
        except ImportError as exc:
            self._error = BackendError(
                "Official SDK missing. Install the live extra: "
                "pip install 'tortletech-webull-mcp[live]'. "
                f"Import error: {exc}"
            )
            return

        api_client = ApiClient(settings.app_key, settings.app_secret, settings.region_id)
        _silence_sdk_loggers(api_client)
        api_client.add_endpoint(settings.region_id, settings.api_host)
        token_dir = settings.token_dir
        if token_dir and hasattr(api_client, "set_token_dir"):
            api_client.set_token_dir(token_dir)
        self._api_client = api_client
        self._trade = TradeClient(api_client)
        self._data = DataClient(api_client)

    def _require_ready(self) -> None:
        if self._error:
            raise self._error
        if self._trade is None or self._data is None:
            raise BackendError("Live OpenAPI client is not initialized.")

    def _resolve_account_id(self) -> str:
        self._require_ready()
        if self._account_id:
            return self._account_id
        payload = _require_ok(self._trade.account_v2.get_account_list(), "get_account_list")
        accounts = _as_list(payload, "account_list", "accounts", "data")
        for item in accounts:
            if isinstance(item, dict) and item.get("account_id"):
                self._account_id = str(item["account_id"])
                return self._account_id
            if isinstance(item, str):
                self._account_id = item
                return self._account_id
        raise BackendError("OpenAPI returned no account_id. Set WEBULL_ACCOUNT_ID.")

    def auth_status(self) -> dict[str, object]:
        if self._error:
            return {
                "ok": False,
                "backend": "live",
                "authenticated": False,
                "mode": "live",
                "error": str(self._error),
                "settings": self.settings.public_dict(),
            }
        try:
            payload = _require_ok(self._trade.account_v2.get_account_list(), "get_account_list")
            accounts = _as_list(payload, "account_list", "accounts", "data")
            return {
                "ok": True,
                "backend": "live",
                "authenticated": True,
                "mode": "live",
                "account_count": len(accounts),
                "api_host": self.settings.api_host,
                "paper": self.settings.paper,
                "note": (
                    "Live OpenAPI session. Quotes/orders come from Webull. "
                    "This server still defaults dry-run on until WEBULL_DRY_RUN=false."
                ),
                "settings": self.settings.public_dict(),
            }
        except Exception as exc:
            return {
                "ok": False,
                "backend": "live",
                "authenticated": False,
                "mode": "live",
                "error": redact(str(exc)),
                "settings": self.settings.public_dict(),
            }

    def quote(self, symbol: str) -> Quote:
        self._require_ready()
        from webull.data.common.category import Category

        symbol = symbol.upper().strip()
        payload = _require_ok(
            self._data.market_data.get_snapshot(symbol, Category.US_STOCK.name),
            "get_snapshot",
        )
        row = _as_list(payload, "result", "snapshots", "data")
        row = row[0] if row else payload
        if not isinstance(row, dict):
            raise BackendError(f"Unexpected snapshot payload for {symbol}")
        last = float(row.get("price") or row.get("close") or row.get("last") or 0)
        bid = float(row.get("bid") or row.get("bid_price") or last)
        ask = float(row.get("ask") or row.get("ask_price") or last)
        volume = int(float(row.get("volume") or 0))
        return Quote(
            symbol=str(row.get("symbol") or symbol),
            last=last,
            bid=bid,
            ask=ask,
            volume=volume,
            source="live",
            note="Live snapshot from Webull OpenAPI. Not mocked.",
        )

    def option_chain(
        self,
        symbol: str,
        expiry: str | None = None,
        right: str | None = None,
    ) -> list[OptionContract]:
        self._require_ready()
        from webull.data.common.category import Category

        symbol = symbol.upper().strip()
        getter = self._data.instrument.get_option_contracts
        try:
            res = getter(Category.US_OPTION.name, symbol)
        except TypeError:
            res = getter(symbol)
        payload = _require_ok(res, "get_option_contracts")
        rows = _as_list(payload, "result", "contracts", "data", "list")
        contracts: list[OptionContract] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            exp = str(row.get("option_expire_date") or row.get("expire_date") or row.get("expiry") or "")
            opt_right = str(row.get("option_type") or row.get("right") or "").upper()
            if expiry and exp and exp != expiry:
                continue
            if right and opt_right and opt_right != right.upper():
                continue
            strike = float(row.get("strike_price") or row.get("strike") or 0)
            occ = str(row.get("symbol") or row.get("option_symbol") or row.get("occ_symbol") or "")
            contracts.append(
                OptionContract(
                    symbol=symbol,
                    underlying=str(row.get("underlying") or symbol),
                    expiry=exp,
                    strike=strike,
                    right=opt_right or "CALL",
                    bid=float(row.get("bid") or 0),
                    ask=float(row.get("ask") or 0),
                    last=float(row.get("price") or row.get("last") or 0),
                    occ_symbol=occ,
                )
            )
        if not contracts:
            raise BackendError(
                f"OpenAPI returned no option contracts for {symbol} "
                f"(expiry={expiry} right={right}). Raw keys: "
                f"{sorted(payload.keys()) if isinstance(payload, dict) else type(payload).__name__}"
            )
        return contracts

    def positions(self) -> list[Position]:
        self._require_ready()
        account_id = self._resolve_account_id()
        payload = _require_ok(
            self._trade.account_v2.get_account_position(account_id),
            "get_account_position",
        )
        rows = _as_list(payload, "positions", "data", "result")
        positions: list[Position] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            instrument = str(row.get("instrument_type") or row.get("asset_type") or "EQUITY").upper()
            kind = "option" if "OPTION" in instrument else "stock"
            qty = float(row.get("quantity") or row.get("qty") or 0)
            positions.append(
                Position(
                    symbol=str(row.get("symbol") or ""),
                    instrument=kind,
                    quantity=qty,
                    average_price=float(row.get("average_price") or row.get("cost_price") or 0),
                    market_value=float(row.get("market_value") or 0),
                    side="LONG" if qty >= 0 else "SHORT",
                    occ_symbol=str(row.get("option_symbol") or "") or None,
                )
            )
        return positions

    def orders(self, status: str | None = None) -> list[Order]:
        self._require_ready()
        account_id = self._resolve_account_id()
        payload = _require_ok(
            self._trade.order_v3.get_order_open(account_id, page_size=50),
            "get_order_open",
        )
        rows = _as_list(payload, "orders", "data", "result")
        if (not status) or (status and status.upper() not in {"OPEN", "PENDING", "MOCK_OPEN"}):
            try:
                history = _require_ok(
                    self._trade.order_v3.get_order_history(account_id, page_size=50),
                    "get_order_history",
                )
                rows = rows + _as_list(history, "orders", "data", "result")
            except BackendError:
                pass
        orders = [_order_from_payload(row) for row in rows if isinstance(row, dict)]
        if status:
            wanted = status.upper()
            orders = [order for order in orders if order.status.upper() == wanted]
        return orders

    def account(self) -> AccountSnapshot:
        self._require_ready()
        account_id = self._resolve_account_id()
        payload = _require_ok(
            self._trade.account_v2.get_account_balance(account_id),
            "get_account_balance",
        )
        row = payload[0] if isinstance(payload, list) and payload else payload
        if not isinstance(row, dict):
            raise BackendError("Unexpected account balance payload")
        cash = float(row.get("cash") or row.get("cash_balance") or row.get("settled_cash") or 0)
        return AccountSnapshot(
            account_id=account_id,
            account_type=str(row.get("account_type") or "UNKNOWN"),
            cash=cash,
            buying_power=float(row.get("buying_power") or cash),
            currency=str(row.get("currency") or "USD"),
            source="live",
            note="Live OpenAPI account snapshot. Not mocked.",
        )

    def place_order(self, request: PlaceOrderRequest) -> OrderResult:
        self._require_ready()
        account_id = self._resolve_account_id()
        client_order_id = (request.client_order_id or uuid.uuid4().hex)[:32]
        new_orders = [_openapi_order_body(request, client_order_id)]
        payload = _require_ok(
            self._trade.order_v3.place_order(account_id, new_orders),
            "place_order",
        )
        order = _order_from_payload(payload, fallback_id=client_order_id, request=request)
        return OrderResult(
            accepted=True,
            status=order.status,
            order=order,
            message="Submitted via Webull OpenAPI. Response is broker JSON, not a synthesized fill.",
            dry_run=False,
            live=True,
            estimated_notional=request.estimated_notional(fallback_price=request.limit_price),
            raw=payload if isinstance(payload, dict) else {"data": payload},
        )

    def cancel_order(self, order_id: str) -> OrderResult:
        self._require_ready()
        account_id = self._resolve_account_id()
        payload = _require_ok(
            self._trade.order_v3.cancel_order(account_id, order_id),
            "cancel_order",
        )
        return OrderResult(
            accepted=True,
            status="CANCEL_SUBMITTED",
            order=None,
            message="Cancel submitted via Webull OpenAPI.",
            dry_run=False,
            live=True,
            raw=payload if isinstance(payload, dict) else {"data": payload},
        )

    def replace_order(
        self,
        order_id: str,
        quantity: float | None,
        limit_price: float | None,
    ) -> OrderResult:
        self._require_ready()
        account_id = self._resolve_account_id()
        modify: dict[str, Any] = {"client_order_id": order_id}
        if quantity is not None:
            modify["quantity"] = str(quantity)
        if limit_price is not None:
            modify["limit_price"] = str(limit_price)
        payload = _require_ok(
            self._trade.order_v3.replace_order(account_id, [modify]),
            "replace_order",
        )
        return OrderResult(
            accepted=True,
            status="REPLACE_SUBMITTED",
            order=None,
            message="Replace submitted via Webull OpenAPI.",
            dry_run=False,
            live=True,
            raw=payload if isinstance(payload, dict) else {"data": payload},
        )


def _openapi_order_body(request: PlaceOrderRequest, client_order_id: str) -> dict[str, Any]:
    side = request.side.upper()
    if request.instrument == "stock":
        body: dict[str, Any] = {
            "combo_type": "NORMAL",
            "client_order_id": client_order_id,
            "symbol": request.symbol.upper(),
            "instrument_type": "EQUITY",
            "market": "US",
            "order_type": request.order_type.upper(),
            "quantity": str(request.quantity),
            "support_trading_session": "CORE",
            "side": side,
            "time_in_force": request.time_in_force.upper(),
            "entrust_type": "QTY",
        }
        if request.limit_price is not None:
            body["limit_price"] = str(request.limit_price)
        return body
    if request.instrument == "option":
        return {
            "client_order_id": client_order_id,
            "combo_type": "NORMAL",
            "order_type": request.order_type.upper(),
            "limit_price": str(request.limit_price),
            "quantity": str(request.quantity),
            "option_strategy": "SINGLE",
            "side": side,
            "time_in_force": request.time_in_force.upper(),
            "entrust_type": "QTY",
            "instrument_type": "OPTION",
            "market": "US",
            "symbol": request.symbol.upper(),
            "legs": [
                {
                    "side": side,
                    "quantity": str(request.quantity),
                    "symbol": request.symbol.upper(),
                    "strike_price": f"{float(request.strike):.2f}",
                    "option_expire_date": request.expiry,
                    "instrument_type": "OPTION",
                    "option_type": str(request.option_type).upper(),
                    "market": "US",
                }
            ],
        }
    raise BackendError(f"Unsupported instrument {request.instrument}")


def _order_from_payload(
    payload: Any,
    fallback_id: str | None = None,
    request: PlaceOrderRequest | None = None,
) -> Order:
    row = payload
    if isinstance(payload, list) and payload:
        row = payload[0]
    if isinstance(row, dict) and "data" in row and isinstance(row["data"], dict):
        row = row["data"]
    if not isinstance(row, dict):
        row = {}
    order_id = str(
        row.get("client_order_id")
        or row.get("order_id")
        or fallback_id
        or "unknown"
    )
    status = str(row.get("status") or row.get("order_status") or "SUBMITTED")
    return Order(
        order_id=order_id,
        client_order_id=str(row.get("client_order_id") or order_id),
        symbol=str(row.get("symbol") or (request.symbol if request else "")),
        instrument=(
            "option"
            if "OPTION" in str(row.get("instrument_type") or "").upper()
            else (request.instrument if request else "stock")
        ),
        side=str(row.get("side") or (request.side if request else "")),
        quantity=float(row.get("quantity") or row.get("qty") or (request.quantity if request else 0)),
        order_type=str(row.get("order_type") or (request.order_type if request else "")),
        limit_price=(
            float(row["limit_price"])
            if row.get("limit_price") is not None
            else (request.limit_price if request else None)
        ),
        status=status,
        filled_qty=float(row.get("filled_quantity") or row.get("filled_qty") or 0),
        note="Broker fields only — this adapter does not invent fills.",
        option_type=request.option_type if request else None,
        strike=request.strike if request else None,
        expiry=request.expiry if request else None,
    )
