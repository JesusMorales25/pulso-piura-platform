/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic admin dashboard verification. */
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const width of [320, 393, 768, 1280]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const profile = {
        sub: "admin-dashboard",
        name: "Admin",
        email: "admin@example.test",
        email_verified: true,
        realm_access: { roles: ["PLATFORM_ADMIN"] },
      };
      await context.addInitScript(
        ({ key, profile }) =>
          sessionStorage.setItem(
            key,
            JSON.stringify({
              profile,
              access_token: "test",
              id_token: "test",
              token_type: "Bearer",
              scope: "openid",
              expires_at: Math.floor(Date.now() / 1000) + 1800,
            }),
          ),
        {
          key: `oidc.user:${process.env.NEXT_PUBLIC_OIDC_ISSUER}:${process.env.NEXT_PUBLIC_OIDC_CLIENT_ID}`,
          profile,
        },
      );
      const rows = [
        {
          id: "request-1",
          userId: "user-1",
          displayName: "Ana pendiente",
          email:
            "ana.con.un.correo.de.prueba.extenso@plataforma-de-ejemplo.test",
          capability: "VENUE_OWNER",
          status: "PENDING",
          reason: "Operar complejo",
        },
        {
          id: "request-2",
          userId: "user-2",
          displayName: "Luis aprobado",
          email: "luis@example.test",
          capability: "MATCH_ORGANIZER",
          status: "APPROVED",
        },
      ];
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
            id: "admin",
            email: profile.email,
            displayName: "Admin",
            emailVerified: true,
            status: "ACTIVE",
            onboardingStatus: "COMPLETE",
          };
        else if (endpoint === "/me/profile")
          data = { userId: "admin", onboardingStatus: "COMPLETE" };
        else if (endpoint === "/platform/summary")
          data = {
            activeUsers: 2,
            pendingRequests: rows.filter((r) => r.status === "PENDING").length,
            organizations: 1,
            venues: 1,
          };
        else if (endpoint === "/platform/users")
          data = [
            {
              id: "user-1",
              displayName: "Ana usuario",
              email:
                "ana.con.un.correo.de.prueba.extenso@plataforma-de-ejemplo.test",
              status: "ACTIVE",
              capabilities: "",
              owner: true,
            },
            {
              id: "user-2",
              displayName: "Luis usuario",
              email: "luis@example.test",
              status: "ACTIVE",
              capabilities: "MATCH_ORGANIZER:APPROVED",
              owner: false,
            },
          ];
        else if (endpoint === "/platform/capability-requests") data = rows;
        else if (endpoint.endsWith("/review")) {
          rows[0].status = JSON.parse(route.request().postData()).decision;
          data = rows[0];
        }
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      await page.goto(
        `${process.env.A11Y_BASE_URL || "http://localhost:3004"}/plataforma`,
      );
      await expect(
        page.getByRole("heading", { name: "Resumen general", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: require("node:path").join(
          __dirname,
          "../../.local/platform-redesign-" + width + ".png",
        ),
        fullPage: true,
      });
      const pending = page.getByRole("button", {
        name: /Solicitudes pendientes/,
      });
      await expect(pending).toContainText("1");
      assert.equal(
        await page
          .locator(".platformRequestCard:visible,.accountDirectoryCard:visible")
          .count(),
        0,
      );
      if (width === 393)
        await page.screenshot({
          path: require("node:path").join(
            __dirname,
            "../../.local/admin-summary-mobile.png",
          ),
        });
      await pending.click();
      const dialog = page.getByRole("dialog").last();
      await expect(
        dialog.getByText("Ana pendiente", { exact: true }),
      ).toBeVisible();
      await expect(
        dialog.getByText("Luis aprobado", { exact: true }),
      ).toHaveCount(0);
      await dialog
        .getByRole("button", { name: "Aprobar", exact: true })
        .click();
      await expect(
        dialog.getByText("No hay solicitudes en este estado."),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Cerrar formulario" }).click();
      await expect(pending).toHaveCount(0);
      await page.getByRole("button", { name: /Usuarios activos/ }).click();
      await page.getByRole("button", { name: /^Organizadores/ }).click();
      await expect(
        dialog.getByText("Luis usuario", { exact: true }),
      ).toBeVisible();
      await expect(
        dialog.getByText("Ana usuario", { exact: true }),
      ).toHaveCount(0);
      await dialog.getByRole("button", { name: /^Todos/ }).click();
      await expect(
        dialog.getByRole("link", {
          name: "Gestionar privilegios",
          exact: true,
        }),
      ).toHaveCount(2);
      await page.screenshot({
        path: require("node:path").join(
          __dirname,
          "../../.local/platform-user-directory-" + width + ".png",
        ),
      });
      assert.equal(
        await dialog.evaluate(
          (element) => element.scrollWidth > element.clientWidth + 1,
        ),
        false,
      );
      await dialog.getByRole("searchbox").fill("dueño");
      await expect(
        dialog.getByText("Ana usuario", { exact: true }),
      ).toBeVisible();
      await expect(
        dialog.getByText("Luis usuario", { exact: true }),
      ).toHaveCount(0);
      await dialog
        .getByRole("button", { name: "Limpiar búsqueda", exact: true })
        .click();
      await dialog.getByRole("button", { name: /^Organizadores/ }).click();
      await dialog.getByRole("searchbox").fill("sin coincidencias");
      await expect(
        dialog.getByText(
          "No hay cuentas que coincidan con este filtro y búsqueda.",
        ),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Cerrar formulario" }).focus();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("dialog", {
          name: "Usuarios · Organizadores",
          exact: true,
        }),
      ).toBeHidden();
      await expect(
        page.getByRole("dialog", { name: "Usuarios activos", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("dialog", { name: "Usuarios activos", exact: true }),
      ).toBeHidden();
      await expect(
        page.getByRole("button", { name: /Usuarios activos/ }),
      ).toBeFocused();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      console.log(`admin dashboard ${width}px passed`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
