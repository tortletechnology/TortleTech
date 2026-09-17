const assert = require("assert");
const engine = require("./engine.js");

function test(name, fn) {
  fn();
  console.log("ok  " + name);
}

test("brand constants", function () {
  assert.strictEqual(engine.BRAND, "TortleTech");
  assert.strictEqual(engine.HANDLE, "@TORTLE420");
  assert.strictEqual(engine.PRICE_USD, 19);
  assert.ok(engine.STRIPE_PAYMENT_LINK.indexOf("buy.stripe.com/cNi00i959bNg9gh22JgnK04") !== -1);
});

test("parses quoted commas and doubled quotes", function () {
  var parsed = engine.parseCsv('a,b\n"hello, world","he said ""hi"""\n', ",");
  assert.deepStrictEqual(parsed.rows[1], ["hello, world", 'he said "hi"']);
});

test("detects tab delimiter", function () {
  var d = engine.detectDelimiter("a\tb\tc\n1\t2\t3\n");
  assert.strictEqual(d, "\t");
});

test("sample CSV flags BOM, duplicates, formulas, scientific SKUs, ragged rows", function () {
  var result = engine.analyze(engine.SAMPLE_CSV);
  var codes = result.findings.map(function (f) {
    return f.code;
  });
  ["bom", "dup-header", "empty-header", "formula", "scientific", "ragged"].forEach(function (code) {
    assert.ok(codes.indexOf(code) !== -1, "missing " + code + " in " + codes.join(","));
  });
  assert.ok(result.meta.bom);
  assert.ok(result.meta.rows >= 4);
});

test("repair strips BOM, names empty headers, pads rows, drops blanks, quotes formulas", function () {
  var out = engine.repair(engine.SAMPLE_CSV);
  assert.ok(!out.csv.charCodeAt(0) || out.csv.charCodeAt(0) !== 0xfeff);
  assert.ok(out.csv.indexOf("column_4") !== -1);
  assert.ok(out.csv.indexOf("Variant SKU_2") !== -1);
  assert.ok(out.csv.indexOf("'=HYPERLINK") !== -1);
  assert.ok(out.log.indexOf("Does not guarantee") !== -1);
  var parsed = engine.parseCsv(out.csv, ",");
  var widths = parsed.rows.map(function (r) {
    return r.length;
  });
  widths.forEach(function (w) {
    assert.strictEqual(w, widths[0]);
  });
  parsed.rows.slice(1).forEach(function (row) {
    var joined = row.join("|");
    assert.ok(joined.trim() !== "", "blank row survived repair");
  });
});

test("serialize quotes delimiters and newlines", function () {
  var csv = engine.serializeCsv(
    [
      ["a", "b"],
      ["x,y", "line\nbreak"],
    ],
    ","
  );
  assert.strictEqual(csv, 'a,b\n"x,y","line\nbreak"');
});

test("empty input is an error, not a crash", function () {
  var result = engine.analyze("   ");
  assert.strictEqual(result.findings[0].code, "empty");
});

console.log("\nAll CSV Preflight engine tests passed.");
