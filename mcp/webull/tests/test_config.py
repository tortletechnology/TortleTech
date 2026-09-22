from tortletech_webull_mcp.config import Settings, load_settings
from tortletech_webull_mcp.redact import redact


def test_public_dict_hides_secrets(monkeypatch, tmp_path):
    monkeypatch.setenv("WEBULL_BACKEND", "mock")
    monkeypatch.setenv("WEBULL_APP_KEY", "super-secret-key")
    monkeypatch.setenv("WEBULL_APP_SECRET", "super-secret-secret")
    monkeypatch.setenv("WEBULL_ACCOUNT_ID", "acc-1")
    settings = load_settings()
    public = settings.public_dict()
    blob = str(public)
    assert "super-secret-key" not in blob
    assert "super-secret-secret" not in blob
    assert public["app_key_configured"] is True
    assert public["app_secret_configured"] is True


def test_rejects_unknown_backend(monkeypatch):
    monkeypatch.setenv("WEBULL_BACKEND", "gui")
    try:
        load_settings()
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "mock" in str(exc)


def test_dotenv_does_not_override(monkeypatch, tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("WEBULL_MAX_NOTIONAL_USD=42\nWEBULL_APP_SECRET=fromfile\n", encoding="utf-8")
    monkeypatch.setenv("WEBULL_MAX_NOTIONAL_USD", "99")
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("WEBULL_APP_SECRET", raising=False)
    monkeypatch.setenv("WEBULL_BACKEND", "mock")
    settings = load_settings()
    assert settings.max_notional_usd == 99.0
    assert settings.app_secret == "fromfile"


def test_redact_nested():
    payload = redact(
        {
            "ok": True,
            "token": "abc",
            "nested": {"app_secret": "xyz", "symbol": "AAPL"},
            "note": "WEBULL_APP_KEY=should-go",
        }
    )
    assert payload["token"] == "[redacted]"
    assert payload["nested"]["app_secret"] == "[redacted]"
    assert payload["nested"]["symbol"] == "AAPL"
    assert "should-go" not in payload["note"]
    assert redact({"app_secret_configured": True})["app_secret_configured"] is True


def test_settings_dataclass_not_logged_raw():
    settings = Settings(
        backend="live",
        dry_run=True,
        paper=True,
        confirm_required=True,
        max_notional_usd=1,
        app_key="abc",
        app_secret="def",
        account_id="id",
        region_id="us",
        environment="sandbox",
        token_dir="/tmp/tokens",
    )
    public = settings.public_dict()
    assert "abc" not in str(public)
    assert "def" not in str(public)
    assert public["api_host"] == "api.sandbox.webull.com"
