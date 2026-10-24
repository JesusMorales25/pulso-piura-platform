/* eslint-disable @typescript-eslint/no-require-imports -- Node test uses CommonJS. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../features/matches/organizer-summary.ts"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
  { exports: exportsObject },
);
const { organizerPaymentParticipants } = exportsObject;
const person = (
  participantId,
  paymentStatus,
  status = "JOINED",
  source = "ACCOUNT",
) => ({ participantId, paymentStatus, status, source });
test("debt excludes waitlist and free places and counts organizer only once", () => {
  const organizer = person("organizer", "UNPAID", "JOINED", "ORGANIZER");
  const rows = [
    organizer,
    organizer,
    person("pending", "PENDING"),
    person("free", "NOT_REQUIRED"),
    person("wait", "UNPAID", "WAITLISTED"),
    person("paid", "PAID"),
  ];
  assert.deepEqual(
    Array.from(
      organizerPaymentParticipants(rows, ["PENDING", "UNPAID"]),
      (row) => row.participantId,
    ),
    ["organizer", "pending"],
  );
});
test("payment mutation moves a manual participant out of debt and into registered and direct", () => {
  const before = [person("manual", "UNPAID", "JOINED", "MANUAL")];
  assert.equal(
    organizerPaymentParticipants(before, ["PENDING", "UNPAID"]).length,
    1,
  );
  const after = [{ ...before[0], paymentStatus: "PAID_DIRECT" }];
  assert.equal(
    organizerPaymentParticipants(after, ["PENDING", "UNPAID"]).length,
    0,
  );
  assert.equal(
    organizerPaymentParticipants(after, ["PAID", "PAID_DIRECT"]).length,
    1,
  );
  assert.equal(organizerPaymentParticipants(after, ["PAID_DIRECT"]).length, 1);
});

test("review counter includes pre-join receipts and removes approved receipts", () => {
  const { organizerPendingProofs } = exportsObject;
  const receipt = {
    id: "pre-join-receipt",
    payerUserId: "not-in-roster",
    status: "PENDING_REVIEW",
  };
  const proofs = [
    receipt,
    receipt,
    { id: "old", status: "CONFIRMED" },
    { id: "correction", status: "CORRECTION_REQUIRED" },
  ];
  assert.equal(organizerPendingProofs(proofs).length, 1);
  assert.equal(
    organizerPendingProofs(
      proofs.map((item) =>
        item.id === receipt.id ? { ...item, status: "CONFIRMED" } : item,
      ),
    ).length,
    0,
  );
});
