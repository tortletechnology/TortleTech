import pytest

from tests.conftest import mock_settings
from tortletech_webull_mcp.safety import SafetyError
from tortletech_webull_mcp.server import TOOL_NAMES, create_mcp, registered_tool_names
from tortletech_webull_mcp.service import WebullService


def test_all_required_tools_registered():
    service = WebullService(mock_settings())
    mcp = create_mcp(service)
    names = registered_tool_names(mcp)
    missing = set(TOOL_NAMES) - names
    assert not missing, missing


def test_quote_positions_account_roundtrip():
    service = WebullService(mock_settings())
    quote = service.quote("AAPL")
    assert quote["ok"] is True
    assert quote["symbol"] == "AAPL"
    chain = service.option_chain("AAPL", right="PUT")
    assert chain["count"] >= 1
    assert chain["contracts"][0]["right"] == "PUT"
    positions = service.positions()
    assert positions["count"] >= 1
    orders = service.orders()
    assert orders["count"] >= 1
    account = service.account()
    assert account["account_type"] == "CASH"
    assert account["ok"] is True


def test_place_order_without_confirm_raises():
    service = WebullService(mock_settings())
    with pytest.raises(SafetyError, match="confirm=true"):
        service.place_order(
            instrument="stock",
            symbol="AAPL",
            side="BUY",
            quantity=1,
            order_type="LIMIT",
            limit_price=10,
            confirm=False,
        )


def test_cancel_replace_dry_run():
    service = WebullService(mock_settings(dry_run=True))
    cancelled = service.cancel_order("mock-open-1", confirm=True)
    assert cancelled["status"] == "DRY_RUN"
    replaced = service.replace_order("mock-open-1", confirm=True, limit_price=1.0)
    assert replaced["status"] == "DRY_RUN"
