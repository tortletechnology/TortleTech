# TortleTech CSV Preflight

Local CSV checker with a paid unlock for conservative repair and export.

**Live:** https://tortletechnology.github.io/TortleTech/csv-preflight/

Brand: **TortleTech** / **@TORTLE420**

## What you get

| Tier | Included |
|------|----------|
| Free | Drop or paste a CSV. Parse stays in the browser. Issue list + grid preview. |
| Paid · **$19** one-time | Repair + download cleaned CSV and a repair log on that browser. |

Repair is conservative: BOM strip, LF/UTF-8, header cleanup, trim, pad ragged rows, drop blank rows, neutralize formula-like cells, expand scientific notation on ID-like columns.

It does **not** guarantee Shopify (or any importer) acceptance and does **not** convert arbitrary platform exports.

## Pay

Stripe Payment Link (live SKU **TortleTech CSV Preflight — Offline Utility**):

```text
https://buy.stripe.com/cNi00i959bNg9gh22JgnK04
```

After checkout, return to the app and add `?unlocked=1`, or enter a license code:

- `TORTLETECH-CSV-PREFLIGHT`
- `TORTLETECH-CSV`
- `TORTLETECH19`

Unlock is stored in `localStorage` for this browser only.

To send buyers straight back here, set the Payment Link success URL to:

`https://tortletechnology.github.io/TortleTech/csv-preflight/?unlocked=1`

## Files

- `index.html` — product UI
- `engine.js` — parse / check / repair
- `engine.test.js` — Node tests (`node csv-preflight/engine.test.js`)
