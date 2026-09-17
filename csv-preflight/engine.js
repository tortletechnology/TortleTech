/**
 * TortleTech CSV Preflight — local parse, check, and conservative repair.
 * Browser + Node. Nothing here phones home.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.TortleTechCsvPreflight = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PRICE_USD = 19;
  var STRIPE_PAYMENT_LINK = "https://buy.stripe.com/cNi00i959bNg9gh22JgnK04";
  var BRAND = "TortleTech";
  var HANDLE = "@TORTLE420";

  var DELIMS = [",", "\t", ";", "|"];
  var ID_HEADER_RE =
    /^(sku|variant sku|barcode|gtin|ean|isbn|upc|id|handle|product id|variant id|phone|zip|postal|ssn)$/i;
  var SHOPIFY_HINTS = ["Handle", "Title", "Variant SKU", "Variant Price", "Option1 Name", "Vendor"];
  var FORMULA_RE = /^[=+\-@|\t]/;

  var SAMPLE_CSV =
    "\uFEFFHandle,Title,Variant SKU,,Variant SKU,Variant Price,Email,Notes\r\n" +
    "forest-tee, Forest Tee ,1.23457E+12,extra,=HYPERLINK(\"http://example.invalid\"),19.00,ops@example.com,ok\r\n" +
    "forest-tee,Forest Tee (Red),SKU-1002,,SKU-1002,19\r\n" +
    "\r\n" +
    "blank-row-should-drop,,,,,,,\r\n" +
    "trail-spaces ,  Padded Title  ,000123, , , 12.50 , not-an-email , leading formula\r\n" +
    "short-row,Only two fields\n" +
    "quoted-nl,\"Line one\nLine two\",SKU-1004,,SKU-1004,9.99,hello@example.com,\"ok, comma\"\n";

  function hasBom(text) {
    return text.charCodeAt(0) === 0xfeff;
  }

  function stripBom(text) {
    return hasBom(text) ? text.slice(1) : text;
  }

  function detectLineEndings(text) {
    var crlf = (text.match(/\r\n/g) || []).length;
    var cr = (text.match(/\r(?!\n)/g) || []).length;
    var lfOnly = 0;
    for (var i = 0; i < text.length; i++) {
      if (text.charAt(i) === "\n" && (i === 0 || text.charAt(i - 1) !== "\r")) lfOnly += 1;
    }
    var lf = lfOnly;
    var mixed = [crlf > 0, cr > 0, lf > 0].filter(Boolean).length > 1;
    var primary = "lf";
    if (crlf >= lf && crlf >= cr && crlf > 0) primary = "crlf";
    else if (cr > lf && cr > 0) primary = "cr";
    return { crlf: crlf, cr: cr, lf: lf, mixed: mixed, primary: primary };
  }

  function detectDelimiter(text) {
    var sample = text.split(/\r\n|\n|\r/).slice(0, 12).join("\n");
    var best = ",";
    var bestScore = -Infinity;
    for (var i = 0; i < DELIMS.length; i++) {
      var d = DELIMS[i];
      var parsed = parseCsv(sample, d);
      if (!parsed.rows.length) continue;
      var widths = parsed.rows.map(function (r) {
        return r.length;
      });
      var max = Math.max.apply(null, widths);
      if (max < 2) continue;
      var mean =
        widths.reduce(function (a, b) {
          return a + b;
        }, 0) / widths.length;
      var variance =
        widths.reduce(function (a, b) {
          return a + Math.pow(b - mean, 2);
        }, 0) / widths.length;
      var score = max * 4 - variance * 3 - parsed.errors.length * 8;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  function parseCsv(text, delimiter) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;
    var errors = [];
    var i = 0;
    var startRow = 1;
    var line = 1;
    var col = 1;

    function pushField() {
      row.push(field);
      field = "";
    }
    function pushRow() {
      rows.push(row);
      row = [];
      startRow = line;
    }

    while (i < text.length) {
      var c = text.charAt(i);
      if (inQuotes) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') {
            field += '"';
            i += 2;
            col += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          col += 1;
          continue;
        }
        if (c === "\n") {
          line += 1;
          col = 1;
        } else {
          col += 1;
        }
        field += c;
        i += 1;
        continue;
      }
      if (c === '"') {
        if (field.length > 0) {
          errors.push({
            line: line,
            message: "Unexpected quote inside an unquoted field (row starting line " + startRow + ").",
          });
        }
        inQuotes = true;
        i += 1;
        col += 1;
        continue;
      }
      if (c === delimiter) {
        pushField();
        i += 1;
        col += 1;
        continue;
      }
      if (c === "\r") {
        if (text.charAt(i + 1) === "\n") i += 1;
        pushField();
        pushRow();
        i += 1;
        line += 1;
        col = 1;
        continue;
      }
      if (c === "\n") {
        pushField();
        pushRow();
        i += 1;
        line += 1;
        col = 1;
        continue;
      }
      field += c;
      i += 1;
      col += 1;
    }
    if (inQuotes) {
      errors.push({ line: line, message: "Unclosed quoted field at end of file." });
    }
    if (field.length > 0 || row.length > 0) {
      pushField();
      pushRow();
    }
    if (rows.length === 1 && rows[0].length === 1 && rows[0][0] === "") {
      rows = [];
    }
    return { rows: rows, errors: errors, delimiter: delimiter };
  }

  function looksScientific(value) {
    return /^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(String(value).trim());
  }

  function expandScientific(value) {
    var raw = String(value).trim();
    if (!looksScientific(raw)) return raw;
    var n = Number(raw);
    if (!isFinite(n)) return raw;
    var abs = Math.abs(n);
    if (abs > 1e18 || (abs > 0 && abs < 1e-6)) return raw;
    var s = n.toFixed(0);
    if (s === "0" && abs !== 0) return raw;
    return s;
  }

  function isBlankRow(cells) {
    return cells.every(function (c) {
      return String(c).trim() === "";
    });
  }

  function headerKey(name, index) {
    var trimmed = String(name).trim();
    return trimmed || "column_" + (index + 1);
  }

  function analyze(text) {
    var findings = [];
    var id = 0;
    function add(sev, code, title, detail, cells) {
      id += 1;
      findings.push({
        id: id,
        severity: sev,
        code: code,
        title: title,
        detail: detail,
        cells: cells || [],
        repairable: Boolean(cells && cells.length),
      });
    }

    if (text == null || String(text).trim() === "") {
      add("error", "empty", "Empty file", "Drop or paste a CSV to run preflight.", []);
      return {
        findings: findings,
        meta: { rows: 0, cols: 0, delimiter: ",", bom: false, lineEndings: detectLineEndings("") },
        headers: [],
        previewRows: [],
        parsed: { rows: [], errors: [], delimiter: "," },
        raw: text || "",
      };
    }

    var original = String(text);
    var bom = hasBom(original);
    var body = stripBom(original);
    var lineEndings = detectLineEndings(body);
    if (bom) {
      add(
        "warn",
        "bom",
        "UTF-8 BOM present",
        "A byte-order mark can break the first header in some importers. Repair strips it.",
        [{ kind: "bom" }]
      );
    }
    if (lineEndings.mixed) {
      add(
        "warn",
        "eol-mixed",
        "Mixed line endings",
        "File mixes CR, LF, and/or CRLF. Repair normalizes to LF.",
        [{ kind: "eol" }]
      );
    }
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(body)) {
      add(
        "error",
        "controls",
        "Control characters",
        "Non-printable control characters were found. Repair strips them (tab is kept).",
        [{ kind: "controls" }]
      );
    }

    var delimiter = detectDelimiter(body);
    var parsed = parseCsv(body.replace(/\r\n|\r/g, "\n"), delimiter);
    parsed.errors.forEach(function (err) {
      add("error", "parse", "Parse issue", err.message + " (line " + err.line + ")", []);
    });

    var rows = parsed.rows.slice();
    if (!rows.length) {
      add("error", "empty", "No rows parsed", "Could not read any CSV rows from this file.", []);
      return {
        findings: findings,
        meta: { rows: 0, cols: 0, delimiter: delimiter, bom: bom, lineEndings: lineEndings },
        headers: [],
        previewRows: [],
        parsed: parsed,
        raw: original,
      };
    }

    var headers = rows[0].map(function (h, idx) {
      return { index: idx, raw: h, trimmed: String(h).trim() };
    });
    var dataRows = rows.slice(1);
    var width = headers.length;
    dataRows.forEach(function (r) {
      if (r.length > width) width = r.length;
    });

    var seen = Object.create(null);
    headers.forEach(function (h, idx) {
      if (!String(h.raw).trim()) {
        add("error", "empty-header", "Empty header", "Column " + (idx + 1) + " has no header name.", [
          { kind: "header", col: idx },
        ]);
      } else if (String(h.raw) !== h.trimmed) {
        add(
          "warn",
          "header-ws",
          "Header whitespace",
          "Column " + (idx + 1) + " header has leading or trailing spaces.",
          [{ kind: "header", col: idx }]
        );
      }
      var key = h.trimmed.toLowerCase();
      if (key) {
        if (seen[key] != null) {
          add(
            "error",
            "dup-header",
            "Duplicate header",
            '"' +
              h.trimmed +
              '" is used more than once (columns ' +
              (seen[key] + 1) +
              " and " +
              (idx + 1) +
              ").",
            [{ kind: "header", col: idx }]
          );
        } else {
          seen[key] = idx;
        }
      }
    });

    var shopifyHits = SHOPIFY_HINTS.filter(function (name) {
      return headers.some(function (h) {
        return h.trimmed.toLowerCase() === name.toLowerCase();
      });
    });
    if (shopifyHits.length >= 2) {
      add(
        "info",
        "shopify-shape",
        "Looks like a product export",
        "Headers resemble a commerce product sheet (" +
          shopifyHits.join(", ") +
          "). Preflight does not guarantee importer acceptance and will not convert platform-specific columns.",
        []
      );
    }

    var blankRows = [];
    var ragged = [];
    var formulaCells = [];
    var sciCells = [];
    var wsCells = [];
    var dupMap = Object.create(null);

    dataRows.forEach(function (row, rIdx) {
      var absRow = rIdx + 2;
      if (isBlankRow(row)) {
        blankRows.push(absRow);
        return;
      }
      if (row.length !== headers.length) {
        ragged.push({ row: absRow, cols: row.length, expected: headers.length });
      }
      row.forEach(function (cell, cIdx) {
        var value = String(cell);
        if (value !== value.trim() && value.trim() !== "") {
          wsCells.push({ row: absRow, col: cIdx });
        }
        if (FORMULA_RE.test(value.trim())) {
          formulaCells.push({ row: absRow, col: cIdx, value: value });
        }
        var headerName = headers[cIdx] ? headers[cIdx].trimmed : "";
        if (looksScientific(value) && (ID_HEADER_RE.test(headerName) || looksScientific(value))) {
          if (ID_HEADER_RE.test(headerName) || /sku|barcode|gtin|id|handle/i.test(headerName)) {
            sciCells.push({ row: absRow, col: cIdx, value: value, header: headerName });
          }
        }
      });
      headers.forEach(function (h, cIdx) {
        if (!ID_HEADER_RE.test(h.trimmed) && !/sku|handle|id/i.test(h.trimmed)) return;
        var v = String(row[cIdx] == null ? "" : row[cIdx]).trim();
        if (!v) return;
        var k = h.trimmed.toLowerCase() + "\0" + v.toLowerCase();
        if (!dupMap[k]) dupMap[k] = [];
        dupMap[k].push(absRow);
      });
    });

    if (blankRows.length) {
      add(
        "warn",
        "blank-rows",
        blankRows.length + " blank row" + (blankRows.length === 1 ? "" : "s"),
        "Empty rows at " + summarizeList(blankRows) + ". Repair drops fully blank rows.",
        blankRows.map(function (r) {
          return { kind: "row", row: r };
        })
      );
    }
    if (ragged.length) {
      add(
        "error",
        "ragged",
        "Inconsistent column counts",
        ragged
          .slice(0, 8)
          .map(function (r) {
            return "Row " + r.row + " has " + r.cols + " fields (expected " + r.expected + ")";
          })
          .join(". ") + (ragged.length > 8 ? "…" : ".") + " Repair pads missing cells and names extra columns.",
        ragged.map(function (r) {
          return { kind: "row", row: r.row };
        })
      );
    }
    if (formulaCells.length) {
      add(
        "error",
        "formula",
        "Spreadsheet formula injection",
        formulaCells.length +
          " cell(s) start with =, +, -, @, or |. Repair prefixes them so spreadsheets treat the value as text.",
        formulaCells.map(function (c) {
          return { kind: "cell", row: c.row, col: c.col };
        })
      );
    }
    if (sciCells.length) {
      add(
        "warn",
        "scientific",
        "Scientific notation in ID-like columns",
        "Excel-style values such as 1.23E+12 often destroy barcodes and SKUs. Repair expands them when the number is a safe integer.",
        sciCells.map(function (c) {
          return { kind: "cell", row: c.row, col: c.col };
        })
      );
    }
    if (wsCells.length) {
      add(
        "info",
        "cell-ws",
        "Leading or trailing spaces",
        wsCells.length + " non-empty cell(s) have extra whitespace. Repair trims them.",
        wsCells.slice(0, 40).map(function (c) {
          return { kind: "cell", row: c.row, col: c.col };
        })
      );
    }

    Object.keys(dupMap).forEach(function (k) {
      var rowsFound = dupMap[k];
      if (rowsFound.length < 2) return;
      var parts = k.split("\0");
      add(
        "warn",
        "dup-value",
        "Repeated " + parts[0],
        '"' + parts[1] + '" appears on rows ' + summarizeList(rowsFound) + ". Reported only — not auto-deleted.",
        []
      );
    });

    if (!findings.some(function (f) {
      return f.severity === "error";
    })) {
      add(
        "info",
        "ok-errors",
        "No blocking parse errors",
        "Structure looks usable. Review warnings before you import.",
        []
      );
    }

    var previewRows = rows.slice(0, 12).map(function (r) {
      var copy = r.slice();
      while (copy.length < width) copy.push("");
      return copy;
    });

    return {
      findings: findings,
      meta: {
        rows: Math.max(0, rows.length - 1),
        cols: width,
        delimiter: delimiter,
        delimiterLabel: delimiter === "\t" ? "tab" : delimiter,
        bom: bom,
        lineEndings: lineEndings,
        bytes: original.length,
      },
      headers: headers,
      previewRows: previewRows,
      parsed: parsed,
      raw: original,
    };
  }

  function summarizeList(nums) {
    if (nums.length <= 6) return nums.join(", ");
    return nums.slice(0, 5).join(", ") + " +" + (nums.length - 5) + " more";
  }

  function uniqueHeader(name, used) {
    var base = name;
    var n = 2;
    var candidate = base;
    while (used[candidate.toLowerCase()]) {
      candidate = base + "_" + n;
      n += 1;
    }
    used[candidate.toLowerCase()] = true;
    return candidate;
  }

  function repair(text) {
    var report = [];
    var original = String(text || "");
    var working = original;
    if (hasBom(working)) {
      working = stripBom(working);
      report.push("Stripped UTF-8 BOM from the start of the file.");
    }
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(working)) {
      working = working.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
      report.push("Removed non-printable control characters (tab preserved).");
    }
    var eol = detectLineEndings(working);
    if (eol.mixed || eol.primary !== "lf") {
      working = working.replace(/\r\n|\r/g, "\n");
      report.push("Normalized line endings to LF.");
    } else {
      working = working.replace(/\r\n|\r/g, "\n");
    }
    var delimiter = detectDelimiter(working);
    var parsed = parseCsv(working, delimiter);
    if (!parsed.rows.length) {
      return {
        csv: original,
        log: report.concat(["No rows to repair."]).join("\n"),
        repairs: report.length,
        rows: [],
      };
    }

    var used = Object.create(null);
    var rawHeaders = parsed.rows[0];
    var width = rawHeaders.length;
    parsed.rows.slice(1).forEach(function (r) {
      if (r.length > width) width = r.length;
    });
    var headers = [];
    for (var c = 0; c < width; c++) {
      var raw = rawHeaders[c] == null ? "" : String(rawHeaders[c]);
      var trimmed = raw.trim();
      if (!trimmed) {
        headers.push(uniqueHeader("column_" + (c + 1), used));
        report.push("Named empty header at column " + (c + 1) + " as " + headers[c] + ".");
      } else {
        var next = uniqueHeader(trimmed, used);
        if (next !== raw) {
          if (next !== trimmed) report.push('Renamed duplicate header "' + trimmed + '" to "' + next + '".');
          else if (trimmed !== raw) report.push("Trimmed whitespace on header column " + (c + 1) + ".");
        }
        headers.push(next);
      }
    }

    var out = [headers];
    var dropped = 0;
    var padded = 0;
    var trimmedCells = 0;
    var formulaFixed = 0;
    var sciFixed = 0;

    parsed.rows.slice(1).forEach(function (row, idx) {
      if (isBlankRow(row)) {
        dropped += 1;
        return;
      }
      var cells = [];
      for (var i = 0; i < width; i++) {
        var value = row[i] == null ? "" : String(row[i]);
        if (i >= row.length) padded += 1;
        var trimmed = value.trim();
        if (trimmed !== value) {
          trimmedCells += 1;
          value = trimmed;
        }
        if (FORMULA_RE.test(value)) {
          value = "'" + value;
          formulaFixed += 1;
        }
        var headerName = headers[i] || "";
        if (looksScientific(value) && (ID_HEADER_RE.test(headerName) || /sku|barcode|gtin|id|handle/i.test(headerName))) {
          var expanded = expandScientific(value);
          if (expanded !== value) {
            value = expanded;
            sciFixed += 1;
          }
        }
        cells.push(value);
      }
      if (row.length > width) {
        report.push("Row " + (idx + 2) + " had extra fields; extra values were dropped after column " + width + ".");
      }
      out.push(cells);
    });

    if (dropped) report.push("Dropped " + dropped + " fully blank row(s).");
    if (padded) report.push("Padded " + padded + " missing cell(s) so every row matches the header width.");
    if (trimmedCells) report.push("Trimmed whitespace on " + trimmedCells + " cell(s).");
    if (formulaFixed) report.push("Neutralized " + formulaFixed + " formula-like cell(s) with a leading apostrophe.");
    if (sciFixed) report.push("Expanded " + sciFixed + " scientific-notation ID value(s) to plain integers.");
    report.push("Exported UTF-8 CSV with delimiter '" + (delimiter === "\t" ? "tab" : delimiter) + "'.");
    report.push("Does not guarantee Shopify (or any importer) acceptance. No platform conversion was applied.");

    return {
      csv: serializeCsv(out, delimiter),
      log: report.join("\n"),
      repairs: report.length,
      rows: out,
      delimiter: delimiter,
    };
  }

  function serializeCsv(rows, delimiter) {
    return rows
      .map(function (row) {
        return row
          .map(function (cell) {
            var s = cell == null ? "" : String(cell);
            var mustQuote =
              s.indexOf('"') !== -1 ||
              s.indexOf(delimiter) !== -1 ||
              s.indexOf("\n") !== -1 ||
              s.indexOf("\r") !== -1;
            if (s.indexOf('"') !== -1) s = s.replace(/"/g, '""');
            return mustQuote ? '"' + s + '"' : s;
          })
          .join(delimiter);
      })
      .join("\n");
  }

  function counts(findings) {
    var out = { error: 0, warn: 0, info: 0 };
    (findings || []).forEach(function (f) {
      if (out[f.severity] != null) out[f.severity] += 1;
    });
    return out;
  }

  return {
    PRICE_USD: PRICE_USD,
    STRIPE_PAYMENT_LINK: STRIPE_PAYMENT_LINK,
    BRAND: BRAND,
    HANDLE: HANDLE,
    SAMPLE_CSV: SAMPLE_CSV,
    analyze: analyze,
    repair: repair,
    parseCsv: parseCsv,
    detectDelimiter: detectDelimiter,
    serializeCsv: serializeCsv,
    counts: counts,
  };
});
