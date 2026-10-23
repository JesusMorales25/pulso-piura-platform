/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser verification. */
const { chromium } = require("@playwright/test");
const axe = require("axe-core");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const base = process.env.A11Y_BASE_URL || "http://localhost:3002";
  assert.ok(
    ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
    "Run this test only against a local build.",
  );
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.A11Y_BROWSER_CHANNEL
      ? { channel: process.env.A11Y_BROWSER_CHANNEL }
      : {}),
  });
  const results = [];
  const audit = async (page, route, width, role = "anonymous") => {
    await page.addScriptTag({ content: axe.source });
    const report = await page.evaluate(async () =>
      window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      }),
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    results.push({
      route,
      role,
      width,
      overflow,
      violations: report.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        nodes: nodes.map(({ target, failureSummary }) => ({
          target,
          failureSummary,
        })),
      })),
    });
  };
  try {
    for (const width of [320, 393, 768]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        bypassCSP: true,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      // Only presentation/catalogue data is stubbed; no production API or accounts are accessed.
      await page.route("**/api/v1/**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        }),
      );
      for (const route of [
        "/informacion/privacidad",
        "/informacion/cookies",
        "/informacion/terminos",
        "/informacion/cancelaciones",
        "/perfil",
        "/crear",
        "/partidos/demo-futbol-7",
      ]) {
        console.log(`Checking ${width}px ${route}`);
        await page.goto(base + route);
        await page.locator("main").first().waitFor();
        await audit(page, route, width);
        await page.keyboard.press("Control+Home");
        await page.keyboard.press("Tab");
        if (
          await page
            .getByRole("link", { name: "Saltar al contenido" })
            .evaluate((el) => el === document.activeElement)
        ) {
          await page.keyboard.press("Enter");
          assert.equal(
            await page
              .locator("#main-content")
              .evaluate((el) => el === document.activeElement),
            true,
          );
        }
      }
      await context.close();
    }
    // Synthetic OIDC sessions exercise UI roles only. Every API response is intercepted locally.
    const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER;
    const client = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
    assert.ok(
      issuer && client,
      "Import the same local public OIDC settings used by the tested build.",
    );
    for (const role of ["player", "organizer", "owner", "admin"]) {
      for (const width of [320, 393, 768]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          bypassCSP: true,
          reducedMotion: "reduce",
        });
        const id = "12345678-1234-1234-1234-123456789abc";
        const organization = {
          id,
          name: "Complejo de prueba",
          slug: "prueba",
          status: "ACTIVE",
          role: "OWNER",
          districtCode: "Piura",
          address: "Dirección de prueba",
        };
        const roles = role === "admin" ? ["PLATFORM_ADMIN"] : [];
        const claims = { sub: `test-${role}`, roles };
        const user = {
          profile: {
            ...claims,
            name: "Persona de prueba",
            email: "test@example.test",
            email_verified: true,
          },
          access_token: `test.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.test`,
          id_token: "test",
          token_type: "Bearer",
          scope: "openid profile email",
          expires_at: Math.floor(Date.now() / 1000) + 1800,
        };
        await context.addInitScript(
          ({ key, user }) => sessionStorage.setItem(key, JSON.stringify(user)),
          { key: `oidc.user:${issuer}:${client}`, user },
        );
        const page = await context.newPage();
        await page.route("**/api/v1/**", (route) => {
          const endpoint = new URL(route.request().url()).pathname.replace(
            "/api/v1",
            "",
          );
          let data = [];
          if (endpoint === "/me")
            data = {
              id,
              email: "test@example.test",
              emailVerified: true,
              displayName: "Persona de prueba",
              avatarUrl: null,
              status: "ACTIVE",
              onboardingStatus: "COMPLETE",
              platformAdmin: role === "admin",
            };
          if (endpoint === "/me/profile")
            data = {
              userId: id,
              preferredDisplayName: "Persona de prueba",
              homeDistrictCode: "",
              bio: "",
              avatarUrl: null,
              visibility: "PRIVATE",
              onboardingStatus: "COMPLETE",
            };
          if (endpoint === "/organizations")
            data = role === "owner" ? [organization] : [];
          if (endpoint === `/organizations/${id}`) data = organization;
          if (endpoint.endsWith("/overview"))
            data = {
              venues: 0,
              spaces: 0,
              members: 1,
              matchesToday: 0,
              reservationsToday: 0,
              expectedMinor: 0,
              locations: "",
            };
          if (endpoint === "/me/capability-requests")
            data =
              role === "organizer"
                ? [{ capability: "MATCH_ORGANIZER", status: "APPROVED" }]
                : role === "owner"
                  ? [{ capability: "VENUE_OWNER", status: "APPROVED" }]
                  : [];
          if (endpoint === "/me/reservations") data = { items: [], total: 0 };
          if (endpoint === "/venue-catalogs")
            data = { sports: [], formats: [], surfaces: [], amenities: [] };
          if (endpoint === "/platform/summary")
            data = {
              activeUsers: 1,
              pendingRequests: 0,
              organizations: 0,
              venues: 0,
            };
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(data),
          });
        });
        const paths = [
          "/perfil",
          ...(role === "organizer" ? ["/crear"] : []),
          ...(role === "owner" ? ["/organizaciones", `/admin/${id}`] : []),
          ...(role === "admin" ? ["/plataforma", "/plataforma/negocios"] : []),
        ];
        for (const route of paths) {
          console.log(`Checking ${role} ${width}px ${route}`);
          await page.goto(base + route);
          if (route === "/perfil")
            await page.locator("form.profileForm").waitFor();
          else await page.locator("main h1").waitFor();
          await audit(page, route, width, role);
          if (role === "organizer" && route === "/crear") {
            await page
              .getByRole("group", { name: "Gestionar partidos" })
              .getByRole("button", { name: "Crear partido", exact: true })
              .click();
            const opener = page.getByRole("button", {
              name: "Crear o continuar partido",
            });
            await opener.click();
            const dialog = page.getByRole("dialog", { name: "Crear partido" });
            await dialog.waitFor();
            await page
              .getByLabel("Nombre de la pichanga")
              .fill("Borrador por teclado");
            await audit(page, route + "#dialog", width, role);
            for (let i = 0; i < 20; i++) {
              await page.keyboard.press("Tab");
              assert.equal(
                await dialog.evaluate((el) =>
                  el.contains(document.activeElement),
                ),
                true,
              );
            }
            await page.keyboard.press("Escape");
            await dialog.waitFor({ state: "hidden" });
            assert.equal(
              await opener.evaluate((el) => el === document.activeElement),
              true,
            );
            await opener.click();
            assert.equal(
              await page.getByLabel("Nombre de la pichanga").inputValue(),
              "Borrador por teclado",
            );
            await page.keyboard.press("Escape");
          }
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const output = path.resolve(
    __dirname,
    "../../.verification/accessibility-results.json",
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify(
      results.map(({ route, width, overflow, violations }) => ({
        route,
        width,
        overflow,
        violations: violations.map((v) => v.id),
      })),
      null,
      2,
    ),
  );
  assert.equal(
    results.some((result) => result.overflow || result.violations.length),
    false,
    "Accessibility violations or overflow remain.",
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
