/* eslint-disable @typescript-eslint/no-require-imports -- Node ejecuta este archivo CommonJS directamente. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (id) => {
      if (id in dependencies) return dependencies[id];
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return exports;
}

test("organizer participates by default in a new match draft", () => {
  const { defaultMatchDraft } = load("features/matches/draft.ts");

  assert.equal(defaultMatchDraft().organizerCounts, true);
});
