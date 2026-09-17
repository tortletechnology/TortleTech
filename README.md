# TortleTech

Offline-first tools by **TortleTech** / **@TORTLE420**.

## Live site

| Surface | URL |
|---------|-----|
| Hub | https://tortletechnology.github.io/TortleTech/ |
| **CSV Preflight** | **https://tortletechnology.github.io/TortleTech/csv-preflight/** |

CSV Preflight is the public SKU in this tree. GitHub Pages serves `csv-preflight/index.html` at `/csv-preflight/`.

## CSV Preflight — scan → pay → repair

1. **Open** https://tortletechnology.github.io/TortleTech/csv-preflight/ — drop or paste a CSV. The free scan never uploads the file.
2. **Pay** with the in-app Stripe button (live Payment Link below).
3. **Unlock** repair + export on that browser: land with `?unlocked=1` after checkout, or enter a license code.

Product details: [csv-preflight/README.md](csv-preflight/README.md).

### Live Stripe Payment Link (CSV Preflight · $19)

```text
https://buy.stripe.com/cNi00i959bNg9gh22JgnK04
```

SKU name: **TortleTech CSV Preflight — Offline Utility**. Wired in `csv-preflight/engine.js` as `STRIPE_PAYMENT_LINK`.

Repair does **not** guarantee Shopify acceptance and does **not** convert arbitrary platform exports.

## GitHub Pages

This repo deploys a static site with [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

- **Trigger:** push to `main`, or **Actions → Deploy GitHub Pages → Run workflow**
- **Source:** GitHub Actions (`actions/configure-pages` with `enablement: true`)
- **Published files:** hub `index.html`, `404.html`, and each product folder that contains `index.html`
- **Fallback:** Settings → Pages → Deploy from branch `main` / `(root)`

### First-time go-live

GitHub Pages on the Free plan requires a **public** repository if Pages is not already enabled for private repos on the org.

1. Merge to `main`.
2. Settings → Pages → Source: GitHub Actions (the workflow also tries `enablement: true`).
3. Confirm https://tortletechnology.github.io/TortleTech/csv-preflight/

## Brand

**TortleTech / @TORTLE420 only.** No personal names or other handles in copy, paths, or commits.
