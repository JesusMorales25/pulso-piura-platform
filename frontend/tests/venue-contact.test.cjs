/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
function helpers() {
  const source = fs.readFileSync(
    path.join(__dirname, "../lib/venue-contact.ts"),
    "utf8",
  );
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports },
  );
  return exports;
}
test("GPS fills an empty address without replacing a written address", () => {
  const { addressWithGps } = helpers();
  assert.equal(
    addressWithGps("", "-5.194", "-80.632"),
    "Ubicación GPS: -5.194000, -80.632000",
  );
  assert.equal(
    addressWithGps("Av. Casuarinas 123", "-5.194", "-80.632"),
    "Av. Casuarinas 123",
  );
  assert.equal(
    addressWithGps("Ubicación GPS: -5.194000, -80.632000", "-5.2", "-80.7"),
    "Ubicación GPS: -5.200000, -80.700000",
  );
});
test("phone input supports nine digits and pasting the +51 country prefix", () => {
  const { peruPhoneDigits, peruPublicPhone } = helpers();
  assert.equal(peruPhoneDigits("+51 987 654 321"), "987654321");
  assert.equal(peruPhoneDigits("987654321111"), "987654321");
  assert.equal(peruPhoneDigits("519876543"), "519876543");
  assert.equal(peruPublicPhone("987654321"), "+51987654321");
  assert.equal(peruPublicPhone("+51 987 654 321"), "+51987654321");
  assert.equal(peruPublicPhone(""), null);
  assert.throws(() => peruPublicPhone("98765432"), /9 dígitos/);
  assert.throws(() => peruPublicPhone("9876543211"), /9 dígitos/);
});
