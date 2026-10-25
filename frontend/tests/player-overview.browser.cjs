/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic player overview verification. */
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
      const profile = {
        sub: "player-overview",
        name: "Jugador",
        email: "player@example.test",
        email_verified: true,
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
              expires_at: Date.parse("2026-10-29T00:00:00Z") / 1000,
            }),
          ),
        {
          key:
            "oidc.user:" +
            process.env.NEXT_PUBLIC_OIDC_ISSUER +
            ":" +
            process.env.NEXT_PUBLIC_OIDC_CLIENT_ID,
          profile,
        },
      );
      const future = "2026-10-27T18:00:00Z",
        end = "2026-10-27T19:00:00Z";
      const rows = [
        ["Pago en revisión", "PENDING_REVIEW", "PENDING_REVIEW"],
        ["Pago por corregir", "PENDING_REVIEW", "CORRECTION_REQUIRED"],
        ["Partido confirmado", "JOINED", "PAID"],
        ["Lista de espera", "WAITLISTED", "NOT_REQUIRED"],
        ["Partido anterior", "JOINED", "PAID"],
      ].map(([title, participationStatus, paymentStatus], i) => ({
        id: "match-" + i,
        publicSlug: "match-" + i,
        title,
        participationStatus,
        paymentStatus,
        spaceName: "Cancha prueba",
        venueName: "Complejo prueba",
        venueAddress: "Piura",
        formatCode: "FOOTBALL_7",
        startsAt: i === 4 ? "2026-10-26T18:00:00Z" : future,
        endsAt: i === 4 ? "2026-10-26T19:00:00Z" : end,
        paidMinor: paymentStatus === "PAID" ? 1500 : 0,
        currency: "PEN",
        checkedInAt: null,
      }));
      const page = await context.newPage();
      await page.clock.install({ time: new Date("2026-10-27T04:59:59Z") });
      await page.clock.pauseAt(new Date("2026-10-27T04:59:59Z"));
      let qrRequests = 0;
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
            id: "player",
            displayName: "Jugador",
            email: profile.email,
            emailVerified: true,
            status: "ACTIVE",
            onboardingStatus: "COMPLETE",
          };
        else if (endpoint === "/me/profile")
          data = { onboardingStatus: "COMPLETE" };
        else if (endpoint === "/matches/participations/me") data = rows;
        else if (endpoint === "/matches/match-2/check-in-pass") {
          qrRequests++;
          data = {
            matchId: "match-2",
            participantId: "participant",
            payload: "PULSO-MATCH:" + "a".repeat(43),
            issuedAt: new Date().toISOString(),
            validUntil: end,
          };
        }
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      await page.goto(base + "/actividad");
      const confirmed = page.getByRole("button", {
        name: /^Confirmados 1 Ver detalle/,
      });
      await expect(confirmed).toBeVisible();
      await expect(
        page.getByRole("button", { name: /^Por confirmar pago 1 Ver detalle/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /^Todos mis partidos 5 Ver detalle/ }),
      ).toBeVisible();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: path.join(
          __dirname,
          "../../.local/player-overview-" + width + ".png",
        ),
        fullPage: true,
      });
      await confirmed.click();
      const dialog = page.getByRole("dialog", {
        name: "Confirmados",
        exact: true,
      });
      await expect(
        dialog.getByRole("button", { name: /Partido confirmado/ }),
      ).toBeVisible();
      await dialog.getByRole("button", { name: /Partido confirmado/ }).click();
      const detail = page.getByRole("dialog", {
        name: "Tu inscripción",
        exact: true,
      });
      await expect(detail.getByText(/El QR se habilitará/)).toBeVisible();
      await expect(
        detail.getByRole("button", { name: "Mostrar mi QR", exact: true }),
      ).toHaveCount(0);
      assert.equal(qrRequests, 0);
      await page.clock.fastForward(1000);
      await detail
        .getByRole("button", { name: "Mostrar mi QR", exact: true })
        .click();
      await expect(
        detail.getByRole("img", {
          name: "Código QR único del jugador",
          exact: true,
        }),
      ).toBeVisible();
      assert.equal(qrRequests, 1);
      await page.clock.fastForward(14 * 60 * 60 * 1000);
      await expect(
        detail.getByRole("img", {
          name: "Código QR único del jugador",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        detail.getByRole("button", { name: "Mostrar mi QR", exact: true }),
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(detail).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: /^Confirmados/ }),
      ).toBeFocused();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      console.log(
        "PASS player overview " +
          width +
          "px counts/dialog/QR midnight and end boundaries/focus/no overflow",
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
