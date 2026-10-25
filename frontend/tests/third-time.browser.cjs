/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic third-time directory verification. */
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const path = require("node:path");
async function main() {
  const base = process.env.A11Y_BASE_URL || "http://localhost:3004";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const width of [320, 393, 768, 1280]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      let mode = "places";
      const places = [
        {
          id: "local-test",
          name: "Terraza de prueba",
          category: "RESTAURANT",
          zone: "Piura, Perú",
          description:
            "Un lugar de prueba para conversar después del partido y coordinar con todo el equipo.",
          imageUrl: null,
          contactPhone: "51987654321",
          mapsUrl: null,
          latitude: -5.194,
          longitude: -80.632,
        },
      ];
      await page.route("**/*", (route) => {
        const u = new URL(route.request().url());
        if (!u.pathname.startsWith("/api/v1/"))
          return ["localhost", "127.0.0.1"].includes(u.hostname)
            ? route.continue()
            : route.abort();
        let data = [];
        let status = 200;
        if (u.pathname === "/api/v1/businesses") {
          assert.equal(route.request().headers().authorization, undefined);
          if (mode === "error") {
            status = 503;
            data = { detail: "Error de prueba" };
          } else data = mode === "empty" ? [] : places;
        }
        return route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      await page.goto(base + "/tercer-tiempo");
      await expect(
        page.getByRole("heading", {
          name: "El tercer tiempo también se juega",
          exact: true,
        }),
      ).toBeVisible();
      const feature = page.getByRole("button", {
        name: "Beneficios próximamente",
        exact: true,
      });
      await feature.click();
      const featureSheet = page.getByRole("dialog", {
        name: "Beneficios próximamente",
        exact: true,
      });
      await expect(
        featureSheet.getByText(/aún no están activos/),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(feature).toBeFocused();
      await expect(page.getByText("1 lugar", { exact: true })).toBeVisible();
      await page.screenshot({
        path: path.join(__dirname, "../../.local/third-time-" + width + ".png"),
        fullPage: true,
      });
      await page
        .getByRole("button", {
          name: "Ver detalles de Terraza de prueba",
          exact: true,
        })
        .click();
      const detail = page.getByRole("dialog", {
        name: "Terraza de prueba",
        exact: true,
      });
      await expect(detail.getByText(/Un lugar de prueba/)).toBeVisible();
      await expect(
        detail.getByRole("link", { name: "Contactar al local", exact: true }),
      ).toHaveAttribute("href", "https://wa.me/51987654321");
      await expect(
        detail.getByRole("link", { name: "Cómo llegar", exact: true }),
      ).toHaveAttribute("href", /https:\/\/www.google.com\/maps\/search/);
      await expect(detail.getByText(/Imagen de referencia/)).toBeVisible();
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Ver todos", exact: true })
        .click();
      const list = page.getByRole("dialog", {
        name: "Todos los lugares",
        exact: true,
      });
      await list.getByRole("button", { name: /Terraza de prueba/ }).click();
      await expect(detail).toBeVisible();
      await detail
        .getByRole("button", { name: "← Volver a los lugares", exact: true })
        .click();
      await expect(list).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Ver todos", exact: true }),
      ).toBeFocused();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      mode = "empty";
      await page.reload();
      await expect(
        page.getByRole("heading", {
          name: "Aún no hay establecimientos publicados",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Ver todos", exact: true }),
      ).toHaveCount(0);
      mode = "error";
      await page.reload();
      await expect(page.getByRole("alert").filter({hasText:"No pudimos cargar"})).toContainText("No pudimos cargar");
      mode = "places";
      await page
        .getByRole("button", { name: "Reintentar", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Ver detalles de Terraza de prueba",
          exact: true,
        }),
      ).toBeVisible();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      console.log(
        "PASS third time " +
          width +
          "px details/list/contact/maps/focus/empty/error/retry/no overflow",
      );
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
