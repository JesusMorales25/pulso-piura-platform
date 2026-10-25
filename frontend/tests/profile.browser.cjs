/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic local profile verification. */
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const path = require("node:path");
async function main() {
  const base = process.env.A11Y_BASE_URL || "http://localhost:3004";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const width of [320, 393, 768, 1280])
      for (const role of ["player", "admin"]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        });
        const identity = {
          sub: "profile-test",
          name: "Jugador de prueba",
          email: "profile@example.test",
          email_verified: true,
          roles: role === "admin" ? ["PLATFORM_ADMIN"] : [],
        };
        await context.addInitScript(
          ({ key, identity }) =>
            sessionStorage.setItem(
              key,
              JSON.stringify({
                profile: identity,
                access_token: "test",
                id_token: "test",
                token_type: "Bearer",
                scope: "openid",
                expires_at: Math.floor(Date.now() / 1000) + 1800,
              }),
            ),
          {
            key:
              "oidc.user:" +
              process.env.NEXT_PUBLIC_OIDC_ISSUER +
              ":" +
              process.env.NEXT_PUBLIC_OIDC_CLIENT_ID,
            identity,
          },
        );
        const page = await context.newPage();
        let saved = null,
          fail = false,
          requests = [];
        let profile = {
          userId: "profile-test",
          preferredDisplayName: "Jugador de prueba",
          homeDistrictCode: "PIURA",
          bio: "Juego con mi equipo",
          avatarUrl: null,
          visibility: "PARTICIPANTS",
          onboardingStatus: "COMPLETE",
        };
        await page.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (!url.pathname.startsWith("/api/v1/"))
            return ["localhost", "127.0.0.1"].includes(url.hostname)
              ? route.continue()
              : route.abort();
          const endpoint = url.pathname.replace("/api/v1", "");
          let data = [];
          if (endpoint === "/me")
            data = {
              id: "profile-test",
              email: identity.email,
              emailVerified: true,
              displayName: identity.name,
              avatarUrl: null,
              status: "ACTIVE",
              onboardingStatus: "COMPLETE",
              platformAdmin: role === "admin",
            };
          if (endpoint === "/me/profile") {
            if (route.request().method() === "PATCH") {
              saved = route.request().postDataJSON();
              if (fail)
                return route.fulfill({
                  status: 400,
                  contentType: "application/json",
                  body: JSON.stringify({
                    message: "No se pudo guardar el perfil de prueba",
                  }),
                });
              profile = {
                ...profile,
                preferredDisplayName: saved.preferredDisplayName,
                bio: saved.bio,
                visibility: saved.visibility,
                homeDistrictCode: saved.homeDistrictCode,
              };
            }
            data = profile;
          }
          if (endpoint === "/me/capability-requests") {
            if (route.request().method() === "POST") {
              const request = route.request().postDataJSON();
              const result = {
                id: request.capability,
                capability: request.capability,
                status:
                  request.capability === "MATCH_ORGANIZER"
                    ? "APPROVED"
                    : "PENDING",
                reason: request.reason,
              };
              requests = [
                result,
                ...requests.filter(
                  (item) => item.capability !== result.capability,
                ),
              ];
              data = result;
            } else data = requests;
          }
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(data),
          });
        });
        await page.goto(base + "/perfil");
        await expect(
          page.getByRole("heading", {
            name: "Información del perfil",
            exact: true,
          }),
        ).toBeVisible();
        const shortcuts = page.getByRole("navigation", {
          name: "Accesos de mi cuenta",
        });
        await expect(
          shortcuts.getByRole("link", { name: /Mi actividad/ }),
        ).toBeVisible();
        await expect(
          shortcuts.getByRole("link", { name: /Administración/ }),
        ).toHaveCount(role === "admin" ? 1 : 0);
        const consent = page.getByRole("checkbox");
        await expect(consent).not.toBeChecked();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
        await page.screenshot({
          path: path.join(
            __dirname,
            "../../.local/profile-" + role + "-" + width + ".png",
          ),
          fullPage: true,
        });
        await page
          .getByRole("textbox", { name: /Nombre visible/ })
          .fill("Jugador actualizado");
        await page
          .getByRole("textbox", { name: /Presentación/ })
          .fill("Mi presentación");
        await expect(page.locator("#profile-bio-count")).toHaveText("15/500");
        await page
          .getByRole("combobox", { name: /Visibilidad/ })
          .selectOption("PRIVATE");
        await page
          .getByRole("button", { name: "Guardar perfil", exact: true })
          .click();
        await expect(
          page.getByRole("heading", {
            name: "Jugador actualizado",
            exact: true,
          }),
        ).toBeVisible();
        assert.equal(saved.visibility, "PRIVATE");
        assert.equal(saved.termsVersion, "");
        assert.equal(saved.privacyVersion, "");
        fail = true;
        await page
          .getByRole("textbox", { name: /Nombre visible/ })
          .fill("Conservar mi edición");
        await page
          .getByRole("button", { name: "Guardar perfil", exact: true })
          .click();
        await expect(
          page.getByRole("textbox", { name: /Nombre visible/ }),
        ).toHaveValue("Conservar mi edición");
        await page
          .getByRole("button", { name: /Activar organización/ })
          .click();
        await expect(
          page.getByText("Solicitud aprobada", { exact: true }),
        ).toBeVisible();
        await page
          .getByRole("textbox", { name: /Cuéntanos brevemente/ })
          .fill("Quiero publicar mi complejo");
        await page
          .getByRole("button", { name: "Solicitar acceso", exact: true })
          .click();
        await expect(
          page.getByText("Solicitud en revisión", { exact: true }),
        ).toBeVisible();
        assert.ok(
          requests.some(
            (item) =>
              item.capability === "VENUE_OWNER" &&
              item.reason === "Quiero publicar mi complejo",
          ),
        );
        console.log(
          role +
            " profile " +
            width +
            "px: layout, permissions, save/error, counters and capability requests passed",
        );
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
