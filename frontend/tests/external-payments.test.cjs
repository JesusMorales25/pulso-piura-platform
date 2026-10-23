/* eslint-disable @typescript-eslint/no-require-imports -- Node executes these tests directly. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const exported = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../features/payments/proof-validation.ts"),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { exports: exported },
);
test("payment preparation expires at its boundary and rejects missing or malformed deadlines", () => {
  const deadline = "2026-10-22T12:00:00Z";
  const now = Date.parse(deadline);
  assert.equal(exported.paymentPreparationActive(deadline, now - 1), true);
  assert.equal(exported.paymentPreparationActive(deadline, now), false);
  assert.equal(exported.paymentPreparationActive(deadline, now + 1), false);
  for (const value of [null, undefined, "", "invalid"])
    assert.equal(exported.paymentPreparationActive(value, now), false);
});
test("receipt uploads require a nonempty image", () => {
  assert.match(exported.proofImageError(null), /Selecciona/);
  assert.match(
    exported.proofImageError({ size: 0, type: "image/png" }),
    /Selecciona/,
  );
});
test("receipt upload boundary accepts JPG and PNG up to exactly five MiB", () => {
  for (const type of ["image/jpeg", "image/png"]) {
    assert.equal(
      exported.proofImageError({ size: 5 * 1024 * 1024, type }),
      null,
    );
    assert.match(
      exported.proofImageError({ size: 5 * 1024 * 1024 + 1, type }),
      /máximo/,
    );
  }
});
test("receipt uploads reject executable, document, and unsupported image formats", () => {
  for (const type of [
    "image/svg+xml",
    "application/pdf",
    "text/html",
    "image/webp",
    "",
  ]) {
    assert.match(exported.proofImageError({ size: 100, type }), /JPG o PNG/);
  }
});
