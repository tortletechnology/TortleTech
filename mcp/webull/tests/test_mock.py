from tortletech_webull_mcp.backend.mock import MockBackend, MOCK_NOTE
from tortletech_webull_mcp.config import Settings


def _settings() -> Settings:
    return Settings(
        backend="mock",
        dry_run=False,
        paper=True,
        confirm_required=True,
        max_notional_usd=500,
        app_key="",
        app_secret="",
        account_id="",
        region_id="us",
        environment="sandbox",
        token_dir="",
    )


def test_quote_and_chain_are_labeled_mock():
    backend = MockBackend(_settings())
    quote = backend.quote("AAPL")
    assert quote.source == "mock"
    assert "MOCK" in quote.note
    chain = backend.option_chain("AAPL", right="CALL")
    assert chain
    assert all(c.right == "CALL" for c in chain)


def test_unknown_symbol():
    backend = MockBackend(_settings())
    try:
        backend.quote("ZZZZ")
        assert False, "expected KeyError"
    except KeyError:
        pass


def test_cancel_and_replace_mock_order():
    backend = MockBackend(_settings())
    replaced = backend.replace_order("mock-open-1", quantity=2, limit_price=550)
    assert replaced.accepted
    assert replaced.status == "MOCK_REPLACED"
    cancelled = backend.cancel_order("mock-open-1")
    assert cancelled.accepted
    assert cancelled.status == "MOCK_CANCELLED"


def test_account_is_cash():
    backend = MockBackend(_settings())
    account = backend.account()
    assert account.account_type == "CASH"
    assert MOCK_NOTE in account.note
