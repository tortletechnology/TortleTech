# TortleTech Redactor

**Offline-first screenshot redactor** — a single HTML file you can sell.

Paste or drop a screenshot → draw solid opaque boxes over secrets → undo/redo → export a flattened PNG. Everything runs in the buyer’s browser. No uploads. No accounts. No tracking.

Suggested price: **$29 one-time**.

**Live app:** https://tortletechnology.github.io/TortleTech/redactor/

---

## Open → pay → unlock

This is the whole product loop.

| Step | What happens |
|------|----------------|
| **1. Open the app** | https://tortletechnology.github.io/TortleTech/redactor/ — preview mode. Paste/drop/open an image, draw boxes, undo/redo. Export is watermarked and resolution-capped. |
| **2. Pay** | Click **Unlock with Stripe**. Checkout uses `STRIPE_PAYMENT_LINK` (default below). |
| **3. Unlock** | After payment, enter an unlock code in the side panel, **or** return on `?unlocked=1` / `?license=CODE`. License is stored in `localStorage` on that browser. Full-res PNG export, no watermark. |

Stripe success redirect (set on the Payment Link under **After payment**):

```text
https://tortletechnology.github.io/TortleTech/redactor/?unlocked=1
```

`?unlocked=1` is a convenience unlock for the hosted app. Always send a real code in the receipt as well.

---

## Pitch (one paragraph)

Builders leak emails, tokens, and customer names in screenshots every day. Blur is cosmetic and sometimes reversible. TortleTech Redactor covers secrets with solid opaque boxes, flattens to PNG, and never sends the image anywhere. Free preview exports are watermarked; unlock once for clean full-resolution downloads on that browser.

---

## What’s in this folder

| File | Purpose |
|------|---------|
| `index.html` | Entire product (HTML + CSS + JS) — UI, paywall, unlock |
| `README.md` | Pitch, pricing, Pages URL, Stripe wiring, X drafts |

The GitHub Pages site also has a hub at `/` that links here. The app itself is self-contained: one file, no build, no backend.

---

## Run it locally (30 seconds)

```bash
# from the repo root
python3 -m http.server 8080
# then open http://localhost:8080/redactor/
```

Or open `redactor/index.html` directly. Clipboard paste of images needs a secure context (https or localhost) in some browsers — drag/drop and Open still work from a `file://` URL.

Works in Chrome, Firefox, Safari, Edge.

---

## Product behavior

### Free / preview
- Open, paste, drop images
- Draw opaque boxes (color presets + stroke)
- Undo / redo / clear
- **Export** opens the paywall; user can still download a **watermarked, capped-resolution** preview PNG

### Paid / unlocked
- Clean PNG (no watermark)
- Full original resolution
- License stored in `localStorage` on that browser

### Unlock paths
1. **Stripe Payment Link** button (`STRIPE_PAYMENT_LINK` in `index.html`)
2. Manual unlock code in the side panel
3. URL params: `?license=CODE` or `?unlocked=1` / `?success=1` (handy for Stripe success URL)

Default accepted codes (case-insensitive; edit in `index.html`):

- `TORTLETECH-REDACTOR`
- `TT-REDACTOR-FULL`
- `TORTLETECH29`

Put the code you email after purchase in `VALID_LICENSE_CODES`. Rotate codes anytime by editing that array.

---

## Stripe wiring

### Current default link

```text
STRIPE_PAYMENT_LINK = https://buy.stripe.com/5kQ14m2GL6sWeAB7n3gnK03
```

This is the live **TortleTech Redactor** Payment Link. It is the default checkout path in the app. Swap it when you publish a different pricing tier.

### Swap for a $29 (or other) pricing tier

1. Stripe Dashboard → **[Payment Links](https://dashboard.stripe.com/payment-links)** → **+ New**.
2. Product: **TortleTech Redactor**, one-time price **$29** (or whatever tier you are selling).
3. **After payment** → don’t keep the default confirmation page if you want instant unlock: redirect to  
   `https://tortletechnology.github.io/TortleTech/redactor/?unlocked=1`  
   (you can append `{CHECKOUT_SESSION_ID}` if you later add session-aware fulfillment).
4. Create the link. Copy the `https://buy.stripe.com/...` URL.
5. In `index.html`, replace:

```js
var STRIPE_PAYMENT_LINK = "https://buy.stripe.com/5kQ14m2GL6sWeAB7n3gnK03";
```

with the new Payment Link. Search the file for `STRIPE_PAYMENT_LINK` — that is the only checkout URL to change.

6. Update the receipt / fulfillment email to include one of the unlock codes (or a unique code you add to `VALID_LICENSE_CODES`).

Keep older Payment Links live if you still want to honor them; the app only needs the URL you want the buttons to open.

### Minimal fulfillment (no backend)

| Step | Action |
|------|--------|
| Checkout | Buyer pays via Payment Link |
| Deliver | Stripe receipt / success page / email with unlock code |
| Activate | Buyer enters code (or lands on `?unlocked=1`) |
| Persist | Browser stores license in `localStorage` |

For automated unique licenses later: Stripe webhook → email unique codes. Not required for MVP.

---

## Deploy (GitHub Pages)

This repo is already wired for Pages.

**Public URL:** https://tortletechnology.github.io/TortleTech/redactor/

| Piece | Detail |
|-------|--------|
| Workflow | `.github/workflows/pages.yml` — runs on push to `main` |
| Path | `redactor/index.html` → `/redactor/` |
| Enable | `actions/configure-pages` with `enablement: true` |
| Fallback | Settings → Pages → Deploy from branch `main` / `(root)` |

If the site 404s after merge: the repository must be **public** on GitHub Free (or the org needs a plan that allows Pages on private repos). Then set **Settings → Pages → Source: GitHub Actions**.

Any other static host also works: upload `redactor/index.html` and point the Stripe success URL at that origin + `?unlocked=1`.

---

## Brand lock

**TortleTech only.** Do not put personal names, other brand handles, or personal domains in copy, comments, filenames, or URLs. Public voice: **TortleTech** / **@TORTLE420**.

---

## X drafts (TortleTech / @TORTLE420)

Checkout link defaults to the Payment Link above until you swap for $29.

### 1 — Launch

Shipping from TortleTech: Redactor.

Paste a screenshot → opaque boxes over secrets → export PNG.

100% offline. No upload. No tracking.

Preview is free (watermarked). Full clean export unlocks with a one-time checkout.

https://tortletechnology.github.io/TortleTech/redactor/
Checkout: https://buy.stripe.com/5kQ14m2GL6sWeAB7n3gnK03

### 2 — Pain → fix

Blur on screenshots is not redaction.

TortleTech Redactor covers emails, tokens, and UI chrome with solid boxes, then flattens to PNG — in your browser only.

Try the preview, unlock when you need clean full-res.

https://tortletechnology.github.io/TortleTech/redactor/

### 3 — Builder audience

If you post dashboards, admin panels, or support tickets: redact before you tweet.

TortleTech Redactor — offline opaque-box redaction, one-time unlock for full-quality export.

Suggested: $29.
https://tortletechnology.github.io/TortleTech/redactor/

### 4 — Soft close

Glad people are using TortleTech Redactor.

Preview exports stay watermarked on purpose. Unlock once for clean full-resolution PNGs on that browser.

Stripe: https://buy.stripe.com/5kQ14m2GL6sWeAB7n3gnK03
App: https://tortletechnology.github.io/TortleTech/redactor/

— TortleTech / @TORTLE420

---

## QA checklist before you sell

- [ ] Open https://tortletechnology.github.io/TortleTech/redactor/ — UI loads, TortleTech branding only
- [ ] Drop + paste image works
- [ ] Draw box, undo, redo, clear
- [ ] Export without license → paywall → watermarked preview downloads
- [ ] Enter `TORTLETECH-REDACTOR` → badge flips to Full export → clean PNG
- [ ] Stripe button opens `STRIPE_PAYMENT_LINK`
- [ ] Search the repo for personal names — must be zero hits
- [ ] Update Payment Link to $29 when ready; set After payment redirect to `...?unlocked=1`; keep codes in sync with fulfillment email

---

## License note for buyers (optional copy)

> TortleTech Redactor is a one-time unlock for full-quality export on the browsers where you activate a license code. The redaction engine itself always runs locally. No warranty for misuse; you are responsible for what you publish.

---

Built to ship. Swap the Stripe link when the $29 product is live, keep the Pages URL, and post as TortleTech / @TORTLE420.
