# TortleTech Webull MCP

Stdio MCP server so **Grok Bot / Cursor** can query and trade Webull with tools instead of Mac GUI automation (`cliclick`). Brand: **TortleTech / @TORTLE420** only.

Default mode is a **mock backend**. CI and local Cursor setups work without Webull credentials. Live trading uses the official [Webull OpenAPI](https://developer.webull.com/apis/docs/) Python SDK — not an unofficial scrape client.

## Why official OpenAPI

Webull publishes Trading + Market Data OpenAPI with App Key / App Secret, sandbox (`api.sandbox.webull.com`) and production (`api.webull.com`) hosts, and an official SDK (`webull-openapi-python-sdk`). Individual access is **application-gated** (developer portal approval). This package:

1. Speaks that SDK when `WEBULL_BACKEND=live` and credentials exist.
2. Ships a labeled mock book otherwise so tools and tests run with no secrets.
3. Does **not** invent live fills. Mock tickets stay `MOCK_ACCEPTED` / `DRY_RUN` with `filled_qty=0`. Live tickets return the broker JSON as-is after secret redaction.

Webull also publishes [`webull-openapi-mcp`](https://github.com/webull-inc/webull-openapi-mcp). This TortleTech server is a smaller, cash-account-gated tool set with the names below and fail-closed safety flags.

Unofficial community clients (login + trade PIN against retail HTTP APIs) are **out of scope**. They conflict with Webull ToS and are a credential-leak risk.

## Cash account policy

Operator accounts are treated as **cash**, not margin:

| Allowed | Blocked |
| --- | --- |
| Long stock | Short stock (SELL only to close a long) |
| Single-leg **buy-to-open** calls/puts | Naked / uncovered short options |
| Sell-to-close a matching long option | Multi-leg / debit spreads / verticals / iron condors |

Debit spreads **often fail on cash** even when OpenAPI would accept the payload. This server rejects extra legs instead of guessing a broker fill.

## Safety gates

Always on unless you change env:

| Flag | Default | Effect |
| --- | --- | --- |
| `WEBULL_DRY_RUN` | `true` | `place` / `cancel` / `replace` return `DRY_RUN` and do not call the broker |
| `WEBULL_PAPER` | `true` | Live mode uses the sandbox host |
| `WEBULL_CONFIRM_REQUIRED` | `true` | Tools require `confirm=true` |
| `WEBULL_MAX_NOTIONAL_USD` | `500` | Options notional uses the 100-share multiplier |

Tokens, app keys, and secrets are never logged. MCP stdio stays on stdout; logs go to stderr. The official SDK's stdout/file loggers are disabled in the live adapter so they cannot leak credentials into the MCP pipe.

## Tools

| Tool | Purpose |
| --- | --- |
| `webull_auth_status` | Backend, dry-run/paper, whether live creds are configured (no secrets) |
| `webull_quote` | Stock quote |
| `webull_option_chain` | Contracts for an underlying (`expiry`, `right` optional) |
| `webull_positions` | Positions |
| `webull_orders` | Orders (optional `status`) |
| `webull_account` | Cash / buying power |
| `webull_place_order` | Stock or **single-leg** option; gated |
| `webull_cancel_order` | Cancel by client order id; gated |
| `webull_replace_order` | Quantity / limit replace; gated |

`webull_place_order` arguments: `symbol`, `side`, `quantity`, `instrument` (`stock`|`option`), `order_type` (`LIMIT` required for options; OpenAPI has no option MARKET), `limit_price`, `time_in_force`, `option_type`, `strike`, `expiry`, `confirm`.

## Install

Python 3.10+. From this directory:

```bash
python3 -m pip install -e ".[dev]"
# live OpenAPI extra (only when you have approved App Key / Secret):
python3 -m pip install -e ".[dev,live]"
cp .env.example .env   # then edit locally — never commit .env
python3 -m pytest
```

Run the server (stdio):

```bash
WEBULL_BACKEND=mock python3 -m tortletech_webull_mcp
```

## Cursor `mcp.json` snippet

User or project MCP config (Cursor: **Settings → MCP**). Point `cwd` at this package and keep secrets in `env`, not in git.

```json
{
  "mcpServers": {
    "webull": {
      "command": "python3",
      "args": ["-m", "tortletech_webull_mcp"],
      "cwd": "/ABS/PATH/TO/TortleTech/mcp/webull",
      "env": {
        "WEBULL_BACKEND": "mock",
        "WEBULL_DRY_RUN": "true",
        "WEBULL_PAPER": "true",
        "WEBULL_CONFIRM_REQUIRED": "true",
        "WEBULL_MAX_NOTIONAL_USD": "500"
      }
    }
  }
}
```

Live-wire (after OpenAPI approval). Still start with dry-run:

```json
{
  "mcpServers": {
    "webull": {
      "command": "python3",
      "args": ["-m", "tortletech_webull_mcp"],
      "cwd": "/ABS/PATH/TO/TortleTech/mcp/webull",
      "env": {
        "WEBULL_BACKEND": "live",
        "WEBULL_DRY_RUN": "true",
        "WEBULL_PAPER": "true",
        "WEBULL_CONFIRM_REQUIRED": "true",
        "WEBULL_MAX_NOTIONAL_USD": "500",
        "WEBULL_APP_KEY": "<from-local-secret-store>",
        "WEBULL_APP_SECRET": "<from-local-secret-store>",
        "WEBULL_ACCOUNT_ID": "<optional-if-list-accounts-works>",
        "WEBULL_REGION_ID": "us",
        "WEBULL_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

If the host uses `uv`:

```json
{
  "mcpServers": {
    "webull": {
      "command": "uv",
      "args": ["run", "--directory", "/ABS/PATH/TO/TortleTech/mcp/webull", "python", "-m", "tortletech_webull_mcp"],
      "env": {
        "WEBULL_BACKEND": "mock",
        "WEBULL_DRY_RUN": "true"
      }
    }
  }
}
```

## Live-wire path (operator)

1. Apply for OpenAPI access: [Webull US OpenAPI management](https://www.webull.com/center#openApiManagement) / docs at [developer.webull.com](https://developer.webull.com/apis/docs/getting-started).
2. Create App Key + App Secret. Store them in env / Cursor MCP `env` only.
3. `pip install -e ".[live]"` so `webull-openapi-python-sdk` is present.
4. Set `WEBULL_BACKEND=live`, keep `WEBULL_DRY_RUN=true`, `WEBULL_PAPER=true`.
5. Call `webull_auth_status`. If 2FA is required, the official SDK stores a token under `WEBULL_OPENAPI_TOKEN_DIR` or its default token dir — **gitignored**, never logged.
6. Exercise `webull_quote` / `webull_account` against **sandbox**.
7. Only then set `WEBULL_DRY_RUN=false`. Place-order still needs `confirm=true`.

Live API calls are **not** executed in CI. Without credentials the live backend raises a clear error instead of fabricating account data.

## Risk / ToS

- Trading can lose money. This server is not investment advice.
- Use of Webull OpenAPI is subject to Webull developer terms, market-data subscriptions, and account option-level approval.
- Do not scrape the retail app. Do not commit `.env`.
- Mock quotes are for wiring Cursor, not for trading decisions.

## Layout

```
mcp/webull/
  src/tortletech_webull_mcp/   # server, safety, mock + live backends
  tests/                       # mock tools, gates, stdio smoke
  .env.example
```
