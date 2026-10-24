/* eslint-disable @typescript-eslint/no-require-imports -- Local browser audit. */
const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const id = "12345678-1234-1234-1234-123456789abc";
const name =
  "Complejo deportivo Los Algarrobos de Castilla y Veintiséis de Octubre";
const email = "administracion.reservas.losalgarrobos@example.test";
const organization = {
  id,
  name,
  slug: "algarrobos",
  status: "ACTIVE",
  role: "OWNER",
  districtCode: "Piura",
  address:
    "Avenida Los Algarrobos, urbanización Santa Margarita, manzana veintiséis lote dieciocho",
};
async function main() {
  const base = process.env.MOBILE_BASE_URL || "http://localhost:3002";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const output = path.resolve(__dirname, "../../.verification/mobile-layout");
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  const pageErrors = [];
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  async function audit(page, role, route, viewport, state = "page") {
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const visible = (e) =>
        e.getClientRects().length &&
        getComputedStyle(e).visibility !== "hidden";
      const describe = (e) =>
        e.tagName + "." + String(e.className).replace(/\s+/g, ".");
      const dialogs = Array.from(
        document.querySelectorAll(
          'dialog[open],[role="dialog"][aria-modal="true"]',
        ),
      )
        .filter(visible)
        .map((e) => {
          const b = e.getBoundingClientRect();
          return {
            name: e.querySelector("h2,h3")?.textContent,
            inBounds:
              b.left >= -1 &&
              b.right <= innerWidth + 1 &&
              b.top >= -1 &&
              b.bottom <= innerHeight + 1,
            horizontalFit: e.scrollWidth <= e.clientWidth + 1,
            bounds: [b.left, b.top, b.right, b.bottom],
          };
        });
      const overflow = Array.from(
        document.querySelectorAll("main *,dialog[open] *"),
      )
        .filter(visible)
        .filter((e) => {
          const b = e.getBoundingClientRect();
          let p = e.parentElement;
          while (p && p !== document.body) {
            if (
              ["auto", "scroll", "hidden", "clip"].includes(
                getComputedStyle(p).overflowX,
              )
            )
              return false;
            p = p.parentElement;
          }
          return b.width && (b.left < -1 || b.right > innerWidth + 1);
        })
        .slice(0, 10)
        .map(describe);
      const edgeCrowding = Array.from(
        document.querySelectorAll("main article, main .panel"),
      )
        .filter(visible)
        .filter((e) => !e.closest("dialog"))
        .filter((e) => {
          const b = e.getBoundingClientRect();
          return (
            b.width > innerWidth * 0.5 &&
            (b.left < 8 || b.right > innerWidth - 8)
          );
        })
        .map(describe);
      return {
        rootOverflow:
          Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          ) >
          innerWidth + 1,
        overflow,
        edgeCrowding,
        dialogs,
      };
    });
    const scrollAccess = [];
    for (const d of await page
      .locator('dialog[open],[role="dialog"][aria-modal="true"]')
      .all()) {
      const c = d
        .locator("button,input,select,textarea,a[href]")
        .filter({ visible: true });
      if (await c.count()) {
        const last = c.last();
        await last.scrollIntoViewIfNeeded();
        scrollAccess.push(
          await last.evaluate((e) => {
            const b = e.getBoundingClientRect(),
              d = e.closest('dialog,[role="dialog"]').getBoundingClientRect();
            return (
              b.top >= Math.max(0, d.top) - 1 &&
              b.bottom <= Math.min(innerHeight, d.bottom) + 1
            );
          }),
        );
      }
    }
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const navClearance = await page.evaluate(() => {
      if (
        document.querySelector(
          'dialog[open],[role="dialog"][aria-modal="true"]',
        )
      )
        return true;
      const ns = Array.from(document.querySelectorAll("nav")).filter((e) => {
        const b = e.getBoundingClientRect();
        return (
          getComputedStyle(e).position === "fixed" &&
          b.bottom >= innerHeight - 1 &&
          b.width > innerWidth / 2 &&
          b.height
        );
      });
      const m = document.querySelector("main");
      return (
        !m ||
        !ns.length ||
        m.getBoundingClientRect().bottom <=
          Math.min(...ns.map((e) => e.getBoundingClientRect().top)) + 1
      );
    });
    await page.evaluate(() => scrollTo(0, 0));
    const screenshot =
      role +
      "-" +
      viewport.width +
      "x" +
      viewport.height +
      "-" +
      route.replace(/[^a-z0-9]/gi, "_") +
      "-" +
      state +
      ".png";
    await page.screenshot({ path: path.join(output, screenshot) });
    const r = {
      role,
      route,
      viewport,
      state,
      ...geometry,
      scrollAccess,
      navClearance,
      screenshot,
    };
    results.push(r);
    console.log(JSON.stringify(r));
  }
  try {
    const viewports = process.env.MOBILE_VIEWPORTS
      ? JSON.parse(process.env.MOBILE_VIEWPORTS)
      : process.env.MOBILE_WIDTHS
        ? process.env.MOBILE_WIDTHS.split(",")
            .map(Number)
            .map((width) => ({ width, height: 852 }))
        : [
            { width: 320, height: 740 },
            { width: 393, height: 852 },
            { width: 768, height: 900 },
            { width: 667, height: 375 },
            { width: 1280, height: 900 },
          ];
    for (const viewport of viewports)
      for (const role of process.env.MOBILE_ROLES?.split(",") ?? [
        "player",
        "organizer",
        "owner",
        "admin",
      ]) {
        const context = await browser.newContext({
          viewport,
          reducedMotion: "reduce",
        });
        const profile = {
          sub: "mobile-" + role,
          name: "María Fernanda de los Ángeles Morales Rodríguez",
          email,
          email_verified: true,
          realm_access: { roles: role === "admin" ? ["PLATFORM_ADMIN"] : [] },
        };
        await context.addInitScript(
          ({ key, profile }) =>
            sessionStorage.setItem(
              key,
              JSON.stringify({
                profile,
                access_token: "synthetic-only",
                id_token: "synthetic-only",
                token_type: "Bearer",
                scope: "openid profile email",
                expires_at: Math.floor(Date.now() / 1000) + 1800,
              }),
            ),
          {
            key:
              "oidc.user:" +
              (process.env.NEXT_PUBLIC_OIDC_ISSUER ||
                "https://issuer.example.test") +
              ":" +
              (process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || "workspace-browser"),
            profile,
          },
        );
        const page = await context.newPage();
        page.on("pageerror", (error) =>
          pageErrors.push({ role, message: error.message }),
        );
        await page.route("**/*", async (route) => {
          const u = new URL(route.request().url());
          if (!u.pathname.startsWith("/api/v1/"))
            return ["localhost", "127.0.0.1"].includes(u.hostname)
              ? route.continue()
              : route.abort();
          const e = u.pathname.replace("/api/v1", "");
          let data = [];
          if (e === "/me")
            data = {
              id,
              displayName: profile.name,
              email,
              emailVerified: true,
              status: "ACTIVE",
              onboardingStatus: "COMPLETE",
              platformAdmin: role === "admin",
            };
          else if (e === "/me/profile")
            data = {
              userId: id,
              preferredDisplayName: profile.name,
              homeDistrictCode: "Piura",
              bio: organization.address,
              visibility: "PRIVATE",
              onboardingStatus: "COMPLETE",
            };
          else if (e === "/organizations")
            data = role === "owner" ? [organization] : [];
          else if (e === "/organizations/" + id) data = organization;
          else if (e.endsWith("/staff") || e.endsWith("/members"))
            data = [
              {
                userId: id,
                displayName: profile.name,
                email,
                role: "OWNER",
                principal: true,
                avatarUrl: null,
              },
            ];
          else if (e === "/me/capability-requests")
            data =
              role === "owner"
                ? [{ capability: "VENUE_OWNER", status: "APPROVED" }]
                : role === "organizer"
                  ? [{ capability: "MATCH_ORGANIZER", status: "APPROVED" }]
                  : [];
          else if (e.endsWith("/overview"))
            data = {
              venues: 0,
              spaces: 0,
              members: 1,
              matchesToday: 0,
              reservationsToday: 0,
              expectedMinor: 0,
              locations: organization.address,
            };
          else if (e === "/venue-catalogs")
            data = { sports: [], formats: [], surfaces: [], amenities: [] };
          else if (e.endsWith("/districts")) data = ["Piura", "Castilla"];
          else if (e === "/venues")
            data = {
              items: [
                {
                  publicSlug: "algarrobos",
                  name,
                  address: organization.address,
                  districtCode: "Piura",
                  publicPhone: null,
                  latitude: null,
                  longitude: null,
                  amenityCodes: [],
                  adminRating: 4.9,
                  adminRatingCount: 42,
                },
              ],
              page: 0,
              size: 10,
              total: 1,
            };
          else if (e === "/venues/algarrobos/spaces")
            data = [
              {
                id,
                name: "Cancha principal de fútbol siete del complejo Los Algarrobos",
                sportCode: "FOOTBALL",
                formatCode: "FOOTBALL_7",
                capacity: 14,
                surfaceType: null,
                indoor: false,
                amenityCodes: [],
              },
            ];
          else if (e.endsWith("/bookable-slots"))
            data = {
              sportSpaceId: id,
              timezone: "America/Lima",
              date: "2099-10-24",
              slots: Array.from({ length: 12 }, (_, i) => ({
                startsAt:
                  "2099-10-24T" + String(10 + i).padStart(2, "0") + ":00:00Z",
                endsAt:
                  "2099-10-24T" + String(11 + i).padStart(2, "0") + ":00:00Z",
                priceMinor: 8500,
                currency: "PEN",
              })),
            };
          else if (e === "/me/reservations")
            data = { items: [], page: 0, size: 10, total: 0 };
          else if (e.endsWith("/reservations/dashboard"))
            data = {
              counts: {
                all: 0,
                confirmed: 0,
                pendingPayment: 0,
                pendingConfirmation: 0,
                cancelled: 0,
                completed: 0,
                expired: 0,
                paid: 0,
                balance: 0,
              },
              paidMinor: 0,
              balanceMinor: 0,
              retainedMinor: 0,
              items: [],
              total: 0,
              page: 0,
              size: 10,
            };
          else if (e === "/external-payments/capabilities")
            data = { enabled: false, reviewMinutes: 30 };
          else if (e === "/payment-orders/capabilities")
            data = { simulationEnabled: false };
          else if (e === "/platform/summary")
            data = {
              activeUsers: 1,
              pendingRequests: 1,
              organizations: 1,
              venues: 0,
            };
          else if (e === "/platform/users")
            data = [
              {
                id,
                displayName: profile.name,
                email,
                status: "ACTIVE",
                capabilities: "MATCH_ORGANIZER:APPROVED",
                districtCode: "Piura",
                owner: true,
              },
            ];
          else if (e === "/platform/capability-requests")
            data = [
              {
                id,
                userId: id,
                displayName: profile.name,
                email,
                capability: "VENUE_OWNER",
                status: "PENDING",
                reason: organization.address,
                createdAt: new Date().toISOString(),
                reviewedAt: null,
              },
            ];
          else if (e === "/platform/organizations") data = [organization];
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(data),
          });
        });
        const routes = [
          "/",
          "/actividad",
          "/perfil",
          ...(role === "player"
            ? [
                "/tercer-tiempo",
                "/partidos/demo-futbol-7",
                "/informacion/privacidad",
                "/informacion/cookies",
                "/informacion/terminos",
                "/informacion/cancelaciones",
                "/?mode=venues&venue=algarrobos&date=2099-10-24",
              ]
            : []),
          ...(role === "organizer" ? ["/crear", "/organizador"] : []),
          ...(role === "owner"
            ? ["/organizaciones", "/reservas-cancha", "/admin/" + id]
            : []),
          ...(role === "admin"
            ? [
                "/plataforma",
                "/plataforma/solicitudes",
                "/plataforma/organizaciones",
                "/plataforma/negocios",
              ]
            : []),
        ];
        for (const route of process.env.MOBILE_ROUTES
          ? JSON.parse(process.env.MOBILE_ROUTES)
          : routes) {
          await page.goto(base + route);
          await page.locator("main").first().waitFor();
          await page.waitForTimeout(400);
          if (route.includes("venue=algarrobos")) {
            const slots = page.getByRole("group", { name: /^Horarios de / });
            await slots.waitFor();
            const firstSlot = slots.getByRole("button").first();
            await firstSlot.click();
            await expect(firstSlot).toHaveAttribute("aria-pressed", "true");
          }
          await audit(page, role, route, viewport);
          async function open(name, state) {
            const b = page.getByRole("button", { name }).first();
            if (!(await b.isVisible())) return;
            await b.click();
            await page.waitForTimeout(150);
            if (
              await page
                .locator('dialog[open],[role="dialog"][aria-modal="true"]')
                .count()
            )
              await audit(page, role, route, viewport, state);
          }
          if (route === "/crear") {
            await open(/^Crear partido$/, "create-mode");
            await open("Crear o continuar partido", "match-form");
          } else if (route.startsWith("/admin/"))
            await open("Nueva sede", "venue-form");
          else if (route === "/organizaciones") {
            await open("Crear complejos", "create-mode");
            await open(/^Crear complejo$/, "organization-form");
          } else if (route === "/plataforma/negocios")
            await open(
              /Nuevo negocio|Agregar negocio|Crear negocio/,
              "business-form",
            );
          else if (route === "/plataforma/solicitudes")
            await open(/^Pendientes/, "requests");
          else if (route === "/plataforma") await open(/^Todos/, "directory");
        }
        await context.close();
      }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(results, null, 2),
    );
  }
  assert.deepEqual(pageErrors, [], "Runtime errors invalidate layout coverage");
  const failures = results.filter(
    (r) =>
      r.rootOverflow ||
      r.overflow.length ||
      r.edgeCrowding.length ||
      r.dialogs.some((d) => !d.inBounds || !d.horizontalFit) ||
      r.scrollAccess.includes(false) ||
      !r.navClearance,
  );
  console.log(
    "Audited " +
      results.length +
      " states; " +
      failures.length +
      " geometry failures. " +
      output,
  );
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
