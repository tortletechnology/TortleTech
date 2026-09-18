# TortleTech

Offline-first tools by **TortleTech** / **@TORTLE420**.

## Live site

| Surface | URL |
|---------|-----|
| Hub | https://tortletechnology.github.io/TortleTech/ |
| **Redactor** | **https://tortletechnology.github.io/TortleTech/redactor/** |

That Redactor URL is the public product. GitHub Pages serves `redactor/index.html` at `/redactor/`.

## Redactor — open → pay → unlock

1. **Open** https://tortletechnology.github.io/TortleTech/redactor/ — paste/drop a screenshot, draw opaque boxes, try a watermarked preview export.
2. **Pay** with the in-app Stripe button (Payment Link below).
3. **Unlock** full-quality PNG export on that browser: enter a license code, or land on the app with `?unlocked=1` after checkout.

Product details, codes, and pricing-tier swap: [redactor/README.md](redactor/README.md).

### Default Stripe Payment Link

```text
https://buy.stripe.com/5kQ14m2GL6sWeAB7n3gnK03
```

Wired in `redactor/index.html` as `STRIPE_PAYMENT_LINK`. Swap that constant when you publish a different pricing tier — steps in [redactor/README.md](redactor/README.md).

## GitHub Pages

This repo deploys a static site with [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

- **Trigger:** push to `main`, or **Actions → Deploy GitHub Pages → Run workflow**
- **Source:** GitHub Actions (`actions/configure-pages` with `enablement: true`)
- **Published files:** `index.html`, `404.html`, `redactor/index.html`
- **Fallback:** the same files live at the repo root, so Settings → Pages → Deploy from branch `main` / `(root)` also works

### First-time go-live

GitHub Pages on the Free plan requires a **public** repository. This repo started private.

1. Merge to `main`.
2. **Settings → General → Danger Zone → Change visibility → Public** (skip if the org already has Pages on private repos).
3. **Settings → Pages → Build and deployment → Source: GitHub Actions**  
   (the workflow also tries to enable this automatically).
4. Confirm the live URL: https://tortletechnology.github.io/TortleTech/redactor/

## Webull MCP

Stdio MCP server for quotes and **gated** cash-account trading (single-leg long options). Mock mode runs without credentials; live mode wraps official Webull OpenAPI.

See [mcp/webull/README.md](mcp/webull/README.md) for tools, safety flags, and a Cursor `mcp.json` snippet.

## Brand

**TortleTech / @TORTLE420 only.** No personal names or other handles in copy, paths, or commits.
