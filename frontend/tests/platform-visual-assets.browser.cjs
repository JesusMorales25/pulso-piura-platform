/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic platform visual assets workflow. */
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
async function main() {
  const base = process.env.A11Y_BASE_URL || "http://localhost:3004";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
    "base64",
  );
  try {
    for (const width of [320, 1280]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      const profile = {
        sub: "visual-admin",
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
      let items = [];
      let uploads = 0;
      let deletes = 0;
      const page = await context.newPage();
      await page.route("**/*", async (route) => {
        const u = new URL(route.request().url());
        if (!u.pathname.startsWith("/api/v1/"))
          return ["localhost", "127.0.0.1"].includes(u.hostname)
            ? route.continue()
            : route.abort();
        const p = u.pathname.replace("/api/v1", "");
        let data = [];
        if (p === "/me")
          data = {
            id: "admin",
            displayName: "Admin",
            email: profile.email,
            emailVerified: true,
            status: "ACTIVE",
            onboardingStatus: "COMPLETE",
            platformAdmin: true,
          };
        else if (p === "/me/profile")
          data = { userId: "admin", onboardingStatus: "COMPLETE" };
        else if (
          p === "/platform/visual-assets" ||
          p === "/public/visual-assets"
        )
          data = items;
        else if (p === "/platform/visual-assets/home-venues") {
          assert.equal(route.request().headers().authorization, "Bearer test");
          if (route.request().method() === "PUT") {
            uploads++;
            items = [
              {
                slot: "home-venues",
                imageUrl: "/api/v1/public/visual-assets/home-venues/image",
              },
            ];
            data = items[0];
          } else if (route.request().method() === "DELETE") {
            deletes++;
            items = [];
            return route.fulfill({ status: 204 });
          }
        } else if (p.endsWith("/image"))
          return route.fulfill({ contentType: "image/png", body: png });
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      await page.goto(base + "/plataforma/imagenes");
      const edit = page.getByRole("button", {
        name: "Cambiar explorar canchas",
        exact: true,
      });
      await edit.click();
      const dialog = page.getByRole("dialog", {
        name: "Explorar canchas",
        exact: true,
      });
      await dialog.getByLabel("Foto de portada").setInputFiles({
        name: "payload.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      });
      await expect(dialog.getByRole("alert")).toBeVisible();
      assert.equal(uploads, 0);
      await dialog.getByLabel("Foto de portada").setInputFiles({
        name: "court.png",
        mimeType: "image/png",
        buffer: png,
      });
      await expect(
        dialog.getByRole("img", { name: "Vista previa de la nueva portada" }),
      ).toBeVisible();
      await page.screenshot({
        path: require("node:path").join(
          __dirname,
          "../../.local/platform-visual-popup-" + width + ".png",
        ),
      });
      await dialog
        .getByRole("button", { name: "Publicar imagen", exact: true })
        .click();
      await expect(dialog).toBeHidden();
      await expect(
        page.getByText("Imagen personalizada", { exact: true }),
      ).toBeVisible();
      assert.equal(uploads, 1);
      await edit.click();
      await dialog
        .getByRole("button", {
          name: "Restaurar imagen de referencia",
          exact: true,
        })
        .click();
      await dialog
        .getByRole("button", { name: "Conservar portada", exact: true })
        .click();
      assert.equal(deletes, 0);
      await dialog
        .getByRole("button", {
          name: "Restaurar imagen de referencia",
          exact: true,
        })
        .click();
      await dialog
        .getByRole("button", { name: "Sí, restaurar imagen", exact: true })
        .click();
      await expect(dialog).toBeHidden();
      assert.equal(deletes, 1);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      console.log(
        "PASS: platform images " +
          width +
          "px upload/invalid/reset/no overflow",
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
