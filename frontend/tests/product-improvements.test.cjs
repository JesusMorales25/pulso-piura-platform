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

test("upcoming matches are copied, past entries excluded and future entries sorted", () => {
  const { sortUpcomingMatches } = load("lib/match-discovery.ts");
  const input = [
    { id: "late", startsAt: "2026-09-29T02:00:00Z" },
    { id: "past", startsAt: "2026-09-27T18:00:00Z" },
    { id: "next", startsAt: "2026-09-28T01:00:00Z" },
  ];

  const result = sortUpcomingMatches(input, Date.parse("2026-09-27T20:00:00Z"));

  assert.deepEqual(result.map((match) => match.id), ["next", "late"]);
  assert.deepEqual(input.map((match) => match.id), ["late", "past", "next"]);
  assert.equal(result.filter((_, index) => index === 0).length, 1);
});

test("reservation payment options use the persisted deposit amount", () => {
  const { reservationPaymentOptions } = load("features/reservations/payment-options.ts");

  const options = reservationPaymentOptions({ totalMinor: 9000, depositMinor: 2250 });

  assert.equal(options.length, 2);
  assert.equal(options[0].plan, "DEPOSIT");
  assert.equal(options[0].amountMinor, 2250);
  assert.equal(options[1].plan, "FULL");
  assert.equal(options[1].amountMinor, 9000);
});

test("venue filters expose sorted unique districts with an empty all option", () => {
  const { districtOptions } = load("lib/venue-discovery.ts");
  const options = districtOptions([
    { districtCode: "PIURA" },
    { districtCode: "castilla" },
    { districtCode: "PIURA" },
  ]);

  assert.equal(options.join("|"), "|castilla|PIURA");
});

test("venue filters match exact district, covered courts and merged LED amenities", () => {
  const { matchesVenueFilters } = load("lib/venue-discovery.ts");
  const base = {
    venue: { districtCode: "Piura", amenityCodes: ["PARKING"] },
    space: { indoor: true, amenityCodes: ["LED_LIGHTING"] },
  };

  assert.equal(matchesVenueFilters(base, { district: "piura", covered: true, led: true }), true);
  assert.equal(matchesVenueFilters(base, { district: "piu", covered: false, led: false }), false);
  assert.equal(
    matchesVenueFilters(
      { venue: { districtCode: "Piura", amenityCodes: ["LED_LIGHTING"] }, space: { indoor: false } },
      { district: "", covered: false, led: true },
    ),
    true,
  );
  assert.equal(
    matchesVenueFilters(
      { venue: { districtCode: "Piura" }, space: { indoor: false } },
      { district: "", covered: false, led: true },
    ),
    false,
  );
});

test("admin rating accepts an empty pair", () => {
  const { normalizeAdminRatingInput } = load("lib/venue-rating.ts");

  const result = normalizeAdminRatingInput("", "");
  assert.equal(result.adminRating, null);
  assert.equal(result.adminRatingCount, null);
});

test("admin rating normalizes a configured value and count", () => {
  const { normalizeAdminRatingInput } = load("lib/venue-rating.ts");

  const configured = normalizeAdminRatingInput("4.9", "142");
  assert.equal(configured.adminRating, 4.9);
  assert.equal(configured.adminRatingCount, 142);
  const minimum = normalizeAdminRatingInput("0.0", "0");
  assert.equal(minimum.adminRating, 0);
  assert.equal(minimum.adminRatingCount, 0);
  const maximum = normalizeAdminRatingInput("5.0", "1");
  assert.equal(maximum.adminRating, 5);
  assert.equal(maximum.adminRatingCount, 1);
});

test("admin rating rejects partial or invalid values", () => {
  const { normalizeAdminRatingInput } = load("lib/venue-rating.ts");

  assert.throws(() => normalizeAdminRatingInput("4.9", ""), /juntas/i);
  assert.throws(() => normalizeAdminRatingInput("", "142"), /juntas/i);
  assert.throws(() => normalizeAdminRatingInput("5.1", "1"), /entre 0 y 5/i);
  assert.throws(() => normalizeAdminRatingInput("4.9", "-1"), /entero positivo/i);
});

test("booking card renders only supplied available slots as accessible buttons", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features/venues/VenueBookingCard.tsx"),
    "utf8",
  );

  assert.match(source, /slots\.slice\(0, 5\)/);
  assert.match(source, /<button[\s\S]*?aria-pressed=/);
  assert.match(source, /selected \? "Elegido" : "Disponible"/);
  assert.match(source, /onReserve\("DEPOSIT"\)/);
  assert.match(source, /onReserve\("FULL"\)/);
  assert.doesNotMatch(source, /reserved|occupied/i);
});

test("availability conflict removes stale selected slots without exposing unavailable states", () => {
  const { reconcileSelectedSlots } = load("lib/venue-availability.ts");
  const selected = [
    { startsAt: "2026-09-28T19:00:00Z", endsAt: "2026-09-28T20:00:00Z" },
    { startsAt: "2026-09-28T20:00:00Z", endsAt: "2026-09-28T21:00:00Z" },
  ];
  const fresh = {
    slots: [
      { startsAt: "2026-09-28T20:00:00Z", endsAt: "2026-09-28T21:00:00Z" },
      { startsAt: "2026-09-28T21:00:00Z", endsAt: "2026-09-28T22:00:00Z" },
    ],
  };

  const result = reconcileSelectedSlots(selected, fresh);

  assert.equal(result.length, 1);
  assert.equal(result[0].startsAt, "2026-09-28T20:00:00Z");
  assert.equal(Object.hasOwn(result[0], "status"), false);
});
