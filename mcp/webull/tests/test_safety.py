import pytest

from tests.conftest import mock_settings
from tortletech_webull_mcp.models import PlaceOrderRequest, Position
from tortletech_webull_mcp.safety import SafetyError, validate_place_request
from tortletech_webull_mcp.service import WebullService


def _buy_call(**kwargs) -> PlaceOrderRequest:
    values = dict(
        instrument="option",
        symbol="AAPL",
        side="BUY",
        quantity=1,
        order_type="LIMIT",
        confirm=True,
        limit_price=3.25,
        option_type="CALL",
        strike=190.0,
        expiry="2026-09-18",
    )
    values.update(kwargs)
    return PlaceOrderRequest(**values)


def test_confirm_required():
    settings = mock_settings()
    with pytest.raises(SafetyError, match="confirm=true"):
        validate_place_request(_buy_call(confirm=False), settings, [], 189.5)


def test_max_notional():
    settings = mock_settings(max_notional_usd=100)
    # 1 contract * 3.25 * 100 = 325 > 100
    with pytest.raises(SafetyError, match="WEBULL_MAX_NOTIONAL_USD"):
        validate_place_request(_buy_call(), settings, [], None)


def test_reject_debit_spread_legs():
    settings = mock_settings()
    req = _buy_call(extra_legs=[{"side": "SELL", "strike": 195}])
    with pytest.raises(SafetyError, match="Multi-leg"):
        validate_place_request(req, settings, [], None)


def test_reject_market_option():
    settings = mock_settings()
    with pytest.raises(SafetyError, match="MARKET"):
        validate_place_request(_buy_call(order_type="MARKET", limit_price=None), settings, [], 3.0)


def test_reject_uncovered_short_option():
    settings = mock_settings()
    with pytest.raises(SafetyError, match="uncovered"):
        validate_place_request(_buy_call(side="SELL"), settings, [], None)


def test_allow_closing_long_option():
    settings = mock_settings()
    positions = [
        Position("AAPL", "option", 1, 3.1, 325, "LONG", occ_symbol="AAPL260918C00190000"),
    ]
    notional = validate_place_request(
        _buy_call(side="SELL", expiry="2026-09-18", strike=190.0),
        settings,
        positions,
        None,
    )
    assert notional == 325.0


def test_reject_short_stock_without_position():
    settings = mock_settings()
    req = PlaceOrderRequest(
        instrument="stock",
        symbol="MSFT",
        side="SELL",
        quantity=1,
        order_type="LIMIT",
        confirm=True,
        limit_price=10,
    )
    with pytest.raises(SafetyError, match="short stock"):
        validate_place_request(req, settings, [], None)


def test_dry_run_never_hits_mock_book():
    service = WebullService(mock_settings(dry_run=True))
    before = service.orders()["count"]
    result = service.place_order(
        instrument="stock",
        symbol="AAPL",
        side="BUY",
        quantity=1,
        order_type="LIMIT",
        limit_price=10,
        confirm=True,
    )
    assert result["status"] == "DRY_RUN"
    assert result["ok"] is True
    assert result["order"]["filled_qty"] == 0
    assert service.orders()["count"] == before


def test_mock_place_without_dry_run_still_not_a_fill():
    service = WebullService(mock_settings(dry_run=False, max_notional_usd=5000))
    result = service.place_order(
        instrument="stock",
        symbol="AAPL",
        side="BUY",
        quantity=1,
        order_type="LIMIT",
        limit_price=10,
        confirm=True,
    )
    assert result["status"] == "MOCK_ACCEPTED"
    assert result["live"] is False
    assert result["order"]["filled_qty"] == 0
    assert "not routed" in result["order"]["note"].lower() or "MOCK" in result["order"]["note"]
