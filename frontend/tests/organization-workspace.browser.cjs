/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression. */
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");

async function main() {
  const base = process.env.A11Y_BASE_URL || "http://localhost:3002";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER;
  const client = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
  assert.ok(issuer && client);
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const scenario of ["create", "retry"]) {
      const context = await browser.newContext({
        viewport: { width: 393, height: 900 },
      });
      const claims = {
        sub: "workspace-test",
        name: "Propietario de prueba",
        email: "owner@example.test",
        email_verified: true,
      };
      await context.addInitScript(
        ({ key, claims }) =>
          sessionStorage.setItem(
            key,
            JSON.stringify({
              profile: claims,
              access_token: "test-only",
              id_token: "test-only",
              token_type: "Bearer",
              scope: "openid profile email",
              expires_at: Math.floor(Date.now() / 1000) + 1800,
            }),
          ),
        { key: `oidc.user:${issuer}:${client}`, claims },
      );
      const organization = {
        id: "12345678-1234-1234-1234-123456789abc",
        name: "Complejo de prueba",
        slug: "prueba",
        status: "ACTIVE",
        role: "OWNER",
        districtCode: "Piura",
        address: "Dirección de prueba",
      };
      let created = scenario === "retry";
      let overviewCalls = 0;
      let fail = scenario === "retry";
      const page = await context.newPage();
      await page.route("**/api/v1/**", async (route) => {
        const endpoint = new URL(route.request().url()).pathname.replace(
          "/api/v1",
          "",
        );
        let data = [];
        let status = 200;
        if (endpoint === "/me")
          data = {
            id: organization.id,
            displayName: claims.name,
            email: claims.email,
            emailVerified: true,
            status: "ACTIVE",
            onboardingStatus: "COMPLETE",
            platformAdmin: false,
          };
        if (endpoint === "/me/profile")
          data = {
            userId: organization.id,
            preferredDisplayName: claims.name,
            homeDistrictCode: "Piura",
            visibility: "PRIVATE",
            onboardingStatus: "COMPLETE",
          };
        if (endpoint === "/me/capability-requests")
          data = [{ capability: "VENUE_OWNER", status: "APPROVED" }];
        if (endpoint === "/venue-catalogs/districts") data = ["Piura"];
        if (endpoint === "/organizations") {
          if (route.request().method() === "POST") {
            created = true;
            data = organization;
            status = 201;
          } else data = created ? [organization] : [];
        }
        if (endpoint === `/organizations/${organization.id}/overview`) {
          overviewCalls++;
          if (fail) {
            status = 503;
            data = { detail: "Resumen temporalmente no disponible" };
          } else
            data = {
              venues: 0,
              spaces: 0,
              members: 1,
              matchesToday: 0,
              reservationsToday: 0,
              expectedMinor: 0,
              locations: null,
            };
        }
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      await page.goto(`${base}/organizaciones`);
      const metrics = page.locator(".ownerOverviewMetrics");
      if (scenario === "create") {
        await page
          .getByRole("button", { name: "Crear complejo", exact: true })
          .click();
        const dialog = page.getByRole("dialog");
        await dialog.locator('[name="name"]').fill("Complejo de prueba");
        await dialog.locator('[name="address"]').fill("Dirección de prueba");
        await dialog.locator('[name="districtCode"]').selectOption("Piura");
        await dialog
          .getByRole("button", { name: "Crear complejo", exact: true })
          .click();
        await expect(
          metrics.locator("article").first().locator("strong"),
        ).toHaveText("1");
        await expect(page.locator(".ownerComplexFacts")).toContainText(
          "1 colaboradores",
        );
        assert.ok(
          overviewCalls > 0,
          "Newly created organization must fetch its overview",
        );
      } else {
        await expect(
          metrics.locator("article").first().locator("strong"),
        ).toHaveText("1");
        await page
          .getByRole("button", { name: "Reintentar resumen", exact: true })
          .waitFor();
        fail = false;
        await page
          .getByRole("button", { name: "Reintentar resumen", exact: true })
          .click();
        await expect(page.locator(".ownerComplexFacts")).toContainText(
          "1 colaboradores",
        );
        assert.ok(overviewCalls >= 2);
      }
      await expect(
        metrics.locator("article").nth(1).locator("strong"),
      ).toHaveText("0");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      console.log(`PASS: ${scenario}, counter=1, overview loaded, no overflow`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
