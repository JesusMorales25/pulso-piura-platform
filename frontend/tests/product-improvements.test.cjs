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

test("financial summary includes organizer debt without duplicating rows", () => {
  const { summarizeMatchFinances } = load("features/matches/presentation.ts");
  const organizer = {
    participantId: "organizer-1",
    userId: "organizer-1",
    source: "ORGANIZER",
    status: "JOINED",
    paymentStatus: "PENDING",
    paidMinor: 0,
  };
  const roster = [
    organizer,
    { ...organizer },
    { participantId: "player-1", source: "ACCOUNT", status: "JOINED", paymentStatus: "PAID", paidMinor: 1500 },
    { participantId: "manual-1", source: "MANUAL", status: "JOINED", paymentStatus: "PAID_DIRECT", paidMinor: 1500 },
    { participantId: "free-1", source: "ACCOUNT", status: "JOINED", paymentStatus: "NOT_REQUIRED", paidMinor: 0 },
  ];

  const summary = summarizeMatchFinances(roster, 1500);

  assert.equal(summary.confirmed.length, 4);
  assert.equal(summary.pending.length, 1);
  assert.equal(summary.pending[0].source, "ORGANIZER");
  assert.equal(summary.onlineMinor, 1500);
  assert.equal(summary.directMinor, 1500);
  assert.equal(summary.collectedMinor, 3000);
  assert.equal(summary.expectedMinor, 4500);
  assert.equal(summary.pendingMinor, 1500);
});

test("financial summary adds a confirmed organizer payment", () => {
  const { summarizeMatchFinances } = load("features/matches/presentation.ts");
  const summary = summarizeMatchFinances([
    { participantId: "organizer-1", source: "ORGANIZER", status: "JOINED", paymentStatus: "PAID", paidMinor: 1500 },
  ], 1500);

  assert.equal(summary.paidOnline.length, 1);
  assert.equal(summary.collectedMinor, 1500);
  assert.equal(summary.pendingMinor, 0);
});

test("organizer row is protected from participant management actions", () => {
  const { isProtectedOrganizerRow } = load("features/matches/presentation.ts");

  assert.equal(isProtectedOrganizerRow({ source: "ORGANIZER" }), true);
  assert.equal(isProtectedOrganizerRow({ source: "ACCOUNT" }), false);
});
