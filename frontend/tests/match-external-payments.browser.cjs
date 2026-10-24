/* eslint-disable @typescript-eslint/no-require-imports -- Local synthetic browser verification. */
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const width of [320, 393, 768]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      const id = "12345678-1234-1234-1234-123456789abc";
      const profile = {
        sub: "organizer-test",
        name: "Organizador",
        email: "organizer@example.test",
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
              expires_at: Math.floor(Date.now() / 1000) + 1800,
            }),
          ),
        {
          key: `oidc.user:${process.env.NEXT_PUBLIC_OIDC_ISSUER}:${process.env.NEXT_PUBLIC_OIDC_CLIENT_ID}`,
          profile,
        },
      );
      let saved = false,
        approved = false,
        rosterReads = 0;
      const destination = {
        holderName: "Organizador receptor",
        phone: "987654321",
        yapeEnabled: true,
        plinEnabled: true,
        configured: true,
        version: "test-version",
      };
      const match = {
        id,
        publicSlug: "partido-test",
        title: "Partido prueba",
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 90000000).toISOString(),
        maxPlayers: 10,
        minPlayers: 2,
        occupiedPlayers: approved ? 1 : 0,
        availablePlayers: 10,
        organizerCounts: false,
        priceMinor: 1500,
        currency: "PEN",
        status: "PUBLISHED",
        visibility: "PUBLIC",
        participantPreview: [],
        amenityNames: [],
      };
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (!url.pathname.startsWith("/api/v1/"))
          return ["localhost", "127.0.0.1"].includes(url.hostname)
            ? route.continue()
            : route.abort();
        const path = url.pathname.replace("/api/v1", "");
        let data = [];
        if (path === "/me")
          data = {
            id,
            email: profile.email,
            displayName: "Organizador",
            emailVerified: true,
            onboardingStatus: "COMPLETE",
            status: "ACTIVE",
          };
        else if (path === "/me/profile")
          data = {
            userId: id,
            preferredDisplayName: "Organizador",
            onboardingStatus: "COMPLETE",
            visibility: "PRIVATE",
          };
        else if (path === "/me/capability-requests")
          data = [{ capability: "MATCH_ORGANIZER", status: "APPROVED" }];
        else if (path === "/external-payments/capabilities")
          data = { enabled: true, reviewMinutes: 30 };
        else if (path === "/matches/mine")
          data = [{ ...match, occupiedPlayers: approved ? 1 : 0 }];
        else if (path === `/matches/${id}/participants`) {
          rosterReads++;
          data = approved
            ? [
                {
                  participantId: id,
                  userId: id,
                  source: "ACCOUNT",
                  displayName: "Jugador",
                  status: "JOINED",
                  paymentStatus: "PAID",
                  paidMinor: 1500,
                  paymentMethod: "YAPE",
                },
              ]
            : [];
        } else if (path === "/external-payments/destination") {
          if (route.request().method() === "PUT") {
            const body = route.request().postDataJSON();
            assert.equal(body.targetType, "MATCH");
            assert.equal(body.targetId, id);
            assert.equal(body.holderName, "Organizador actualizado");
            saved = true;
          }
          data = destination;
        } else if (path === "/external-payments")
          data = [
            {
              id,
              targetType: "MATCH",
              targetId: id,
              payerUserId: id,
              payerName: "Jugador",
              amountMinor: 1500,
              currency: "PEN",
              method: "YAPE",
              plan: "FULL",
              status: approved ? "CONFIRMED" : "PENDING_REVIEW",
              createdAt: new Date().toISOString(),
              reviewExpiresAt: new Date(Date.now() + 900000).toISOString(),
              canReview: true,
              hasImage: false,
              ...destination,
            },
          ];
        else if (path === `/external-payments/${id}/decision`) {
          approved = true;
          data = {};
        }
        assert.ok(
          !path.includes("external-payment-destination"),
          "Match configuration must never write an organization destination.",
        );
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      await page.goto("http://localhost:3002/organizador");
      const reviewSummary = page.getByRole("button", {
        name: /Por confirmar pago/,
      });
      await reviewSummary.filter({ hasText: "1" }).waitFor();
      assert.equal(
        await page.locator(".organizerMatchCard:visible").count(),
        0,
        "Dashboard must initially show only summaries",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Editar cuenta receptora", exact: true })
          .count(),
        0,
      );
      await reviewSummary.click();
      const reviewSheet = page.getByRole("dialog", {
        name: "Por confirmar pago",
        exact: true,
      });
      await reviewSheet
        .getByRole("button", {
          name: /Partido prueba.*1 comprobantes por revisar/,
        })
        .click();
      await reviewSheet
        .getByRole("button", { name: "Revisar pagos", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Editar cuenta receptora", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Cuenta receptora del organizador",
        exact: true,
      });
      await dialog
        .getByRole("textbox", { name: "Titular", exact: true })
        .fill("Organizador actualizado");
      await dialog
        .getByRole("checkbox", { name: /Confirmo que el titular/ })
        .check();
      await dialog
        .getByRole("button", { name: "Guardar cuenta receptora" })
        .click();
      await dialog.waitFor({ state: "hidden" });
      assert.ok(saved);
      await page
        .getByRole("textbox", { name: "Motivo de la decisión" })
        .fill("Verificado por organizador de prueba");
      const before = rosterReads;
      await page.getByRole("button", { name: "Registrar decisión" }).click();
      await page
        .getByRole("heading", { name: "Pago confirmado", exact: true })
        .waitFor();
      await page.getByRole("link", { name: /Jugador/ }).count();
      assert.ok(approved);
      assert.ok(
        rosterReads > before,
        "Approving a match proof must refresh its roster and finances.",
      );
      // A pre-join proof was counted even though the initial roster was empty.
      // After approval, the selected detail remains open while the proof leaves the list.
      await page.waitForFunction(() => {
        const button = [...document.querySelectorAll("button")].find((item) =>
          item.textContent.includes("Por confirmar pago"),
        );
        return button?.querySelector("strong")?.textContent === "0";
      });
      await reviewSheet
        .getByRole("button", { name: "← Volver a la lista", exact: true })
        .click();
      await reviewSheet
        .getByText("No hay partidos en esta categoría.", { exact: true })
        .waitFor();
      await reviewSheet
        .getByRole("button", { name: "Cerrar formulario", exact: true })
        .click();
      await page
        .getByRole("button", { name: /Pagos registrados/ })
        .filter({ hasText: "1" })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      console.log(`match organizer ${width}px passed`);
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
