/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic dashboard browser verification. */
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const path = require("node:path");
async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const width of [320, 393, 768, 1280])
      for (const role of ["payer", "owner"]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const org = "12345678-1234-1234-1234-123456789abc";
        const profile = {
          sub: `dashboard-${role}`,
          name: "Prueba",
          email: "test@example.test",
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
        const rows = Array.from({ length: 25 }, (_, index) => ({
          id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
          sportSpaceId: org,
          venueName: "Complejo prueba",
          spaceName: `Cancha ${index + 1}`,
          spaceCapacity: 10,
          matchAssociated: false,
          customerEmail: "test@example.test",
          startsAt: new Date(Date.now() + 172800000).toISOString(),
          endsAt: new Date(Date.now() + 176400000).toISOString(),
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          status:
            index < 12
              ? "PENDING_PAYMENT_CONFIRMATION"
              : index < 20
                ? "CONFIRMED"
                : "CANCELLED",
          totalMinor: 8500,
          depositMinor: 1700,
          paidMinor: index >= 12 && index < 20 ? 1700 : 0,
          currency: "PEN",
          version: 0,
        }));
        const requests = [];
        const matches = (r, filter) =>
          filter === "ALL" ||
          (filter === "PAID"
            ? r.paidMinor > 0
            : filter === "BALANCE"
              ? r.status === "CONFIRMED" && r.paidMinor < r.totalMinor
              : filter === "PENDING_PAYMENT"
                ? ["HOLD", "PENDING_PAYMENT"].includes(r.status)
                : r.status === filter);
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
              id: org,
              email: profile.email,
              displayName: "Prueba",
              emailVerified: true,
              status: "ACTIVE",
              onboardingStatus: "COMPLETE",
            };
          else if (endpoint === "/me/profile")
            data = {
              userId: org,
              preferredDisplayName: "Prueba",
              visibility: "PRIVATE",
              onboardingStatus: "COMPLETE",
            };
          else if (endpoint === "/organizations")
            data =
              role === "owner"
                ? [{ id: org, name: "Complejo prueba", role: "OWNER" }]
                : [];
          else if (endpoint === "/me/capability-requests")
            data =
              role === "owner"
                ? [{ capability: "VENUE_OWNER", status: "APPROVED" }]
                : [];
          else if (endpoint === "/external-payments/capabilities")
            data = { enabled: true, reviewMinutes: 30 };
          else if (endpoint === "/payment-orders/capabilities")
            data = { simulationEnabled: false };
          else if (endpoint === "/external-payments/destination")
            data = {
              configured: true,
              holderName: "Receptor prueba",
              phone: "999888777",
              yapeEnabled: true,
              plinEnabled: true,
              version: "1",
            };
          else if (endpoint === "/external-payments")
            data = [
              {
                id: "proof-test",
                targetType: "RESERVATION",
                targetId: url.searchParams.get("targetId"),
                payerUserId: org,
                payerName: "Cliente prueba",
                amountMinor: 1700,
                currency: "PEN",
                method: "YAPE",
                plan: "DEPOSIT",
                status: "CONFIRMED",
                reference: "PRUEBA",
                createdAt: "2026-10-24T18:00:00Z",
                reviewExpiresAt: "2026-10-24T18:30:00Z",
                reviewedAt: "2026-10-24T18:10:00Z",
                reviewNote: "Verificado",
                holderName: "Receptor prueba",
                phone: "999888777",
                canReview: false,
                hasImage: true,
              },
            ];
          else if (endpoint === "/external-payments/history")
            data = [
              {
                id: "event-confirm",
                proofId: "proof-test",
                action: "CONFIRMED",
                note: "Verificado",
                occurredAt: "2026-10-24T18:10:00Z",
              },
              {
                id: "event-correct",
                proofId: "proof-test",
                action: "CORRECTION_REQUIRED",
                note: "No se visualiza claramente",
                occurredAt: "2026-10-24T18:05:00Z",
              },
              {
                id: "event-submit",
                proofId: "proof-test",
                action: "PROOF_SUBMITTED",
                note: null,
                occurredAt: "2026-10-24T18:00:00Z",
              },
            ];
          else if (endpoint.endsWith("/history"))
            data = [
              {
                id: "created",
                previousStatus: null,
                status: "HOLD",
                occurredAt: "2026-10-24T17:59:00Z",
              },
            ];
          else if (endpoint === "/external-payments/proof-test/image")
            return route.fulfill({
              contentType: "image/png",
              body: require("node:fs").readFileSync(
                path.join(__dirname, "../public/images/demo-court-night.png"),
              ),
            });
          else if (endpoint.endsWith("/reservations/dashboard")) {
            const filter = url.searchParams.get("filter");
            const index = Number(url.searchParams.get("page") || 0);
            requests.push({ filter, page: index });
            const selected = rows.filter((r) => matches(r, filter || "ALL"));
            data = {
              counts: {
                all: rows.length,
                confirmed: rows.filter((r) => matches(r, "CONFIRMED")).length,
                pendingPayment: 0,
                pendingConfirmation: rows.filter((r) =>
                  matches(r, "PENDING_PAYMENT_CONFIRMATION"),
                ).length,
                cancelled: rows.filter((r) => matches(r, "CANCELLED")).length,
                completed: 0,
                expired: 0,
                paid: 8,
                balance: 8,
              },
              paidMinor: 13600,
              balanceMinor: 54400,
              retainedMinor: 0,
              items: filter ? selected.slice(index * 10, index * 10 + 10) : [],
              total: selected.length,
              page: index,
              size: 10,
            };
          } else if (
            endpoint.includes("/reservations/") &&
            endpoint.endsWith("/cancel")
          ) {
            const id = endpoint.split("/").at(-2);
            const row = rows.find((r) => r.id === id);
            row.status = "CANCELLED";
            row.expiresAt = null;
            row.version++;
            data = row;
          } else if (endpoint.startsWith("/reservations/"))
            data = rows.find((r) => r.id === endpoint.split("/").at(-1));
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(data),
          });
        });
        await page.goto(
          (process.env.A11Y_BASE_URL || "http://localhost:3004") +
            (role === "owner" ? "/reservas-cancha" : "/actividad"),
        );
        if (role === "owner")
          await page
            .getByRole("button", { name: "Reservas y pagos", exact: true })
            .click();
        else
          await page
            .getByRole("tab", { name: "Mis reservas", exact: true })
            .click();

        await page.getByRole("button", { name: /^Confirmadas/ }).click();
        await page
          .getByRole("button", { name: /Cancha 13 .*Ver reserva/ })
          .click();
        const detail = page.getByRole("dialog", {
          name: "Detalle de reserva",
          exact: true,
        });
        await expect(
          detail.getByRole("heading", {
            name: "Resumen de montos",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          detail.getByRole("heading", { name: "Cancha 13", exact: true }),
        ).toBeVisible();
        await expect(
          detail.getByRole("heading", { name: "Pago confirmado", exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: path.join(
            __dirname,
            "../../.local/reservation-detail-" + role + "-" + width + ".png",
          ),
        });
        await detail
          .getByRole("button", { name: "Historial de estados", exact: false })
          .click();
        const history = page.getByRole("dialog", {
          name: "Historial de estados",
          exact: true,
        });
        await expect(
          history.getByRole("heading", {
            name: "Necesita corrección",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          history.getByRole("heading", { name: "Reserva creada", exact: true }),
        ).toBeVisible();
        await expect(
          history.getByText("No se visualiza claramente", { exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: path.join(
            __dirname,
            "../../.local/reservation-history-" + role + "-" + width + ".png",
          ),
        });
        await history
          .getByRole("button", { name: "Ver comprobante", exact: true })
          .first()
          .click();
        const image = page.getByRole("dialog", {
          name: "Comprobante de pago",
          exact: true,
        });
        await expect(
          image.getByRole("img", { name: "Comprobante de pago enviado" }),
        ).toBeVisible();
        await image
          .getByRole("button", { name: "Cerrar formulario", exact: true })
          .click();
        await expect(history).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(history).not.toBeVisible();
        await expect(detail).toBeVisible();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
        console.log(
          role +
            " detail/history " +
            width +
            "px: real event fields, proof popup and modal navigation passed",
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
