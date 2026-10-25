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
            data = { enabled: false, reviewMinutes: 30 };
          else if (endpoint === "/payment-orders/capabilities")
            data = { simulationEnabled: false };
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
        const review = page.getByRole("button", {
          name: /^Por confirmar pago/,
        });
        await expect(review).toContainText("12");
        assert.equal(
          await page
            .locator(
              ".reservationCard:visible,.reservationDashboardCard:visible",
            )
            .count(),
          0,
        );
        assert.ok(
          requests.every((r) => r.filter === null),
          "Initial dashboard must request summary only.",
        );
        if (role === "payer") {
          await expect(
            page.getByRole("link", { name: "Buscar canchas", exact: true }),
          ).toBeVisible();
          await expect(
            page.getByRole("button", {
              name: /^Saldo pendiente 8 Ver detalle/,
            }),
          ).toContainText("544");
        }
        if (width === 393)
          await page.screenshot({
            path: path.join(
              __dirname,
              `../../.local/dashboard-${role}-summary-mobile.png`,
            ),
          });
        await review.click();
        const sheet = page.getByRole("dialog", {
          name: "Por confirmar pago",
          exact: true,
        });
        await sheet.waitFor();
        await expect(
          sheet.getByRole("button", { name: /Cancha .*Ver reserva/ }),
        ).toHaveCount(10);
        await sheet
          .getByRole("button", { name: "Siguiente", exact: true })
          .click();
        await expect(
          sheet.getByRole("button", { name: /Cancha .*Ver reserva/ }),
        ).toHaveCount(2);
        await sheet
          .getByRole("button", { name: /Cancha 11 .*Ver reserva/ })
          .click();
        await page
          .getByRole("button", { name: "Cancelar reserva", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Confirmar cancelación", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "Cancelada", exact: true })
          .count();
        await page
          .getByRole("dialog")
          .filter({ visible: true })
          .getByRole("button", { name: "Cerrar formulario", exact: true })
          .click();
        await expect(review).toContainText("11");
        await review.click();
        await expect(
          page.getByRole("button", { name: /Cancha .*Ver reserva/ }),
        ).toHaveCount(10);
        await page
          .getByRole("combobox", { name: "Categoría", exact: true })
          .selectOption("CANCELLED");
        await expect(
          page.getByRole("button", { name: /Cancha .*Ver reserva/ }),
        ).toHaveCount(6);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
        if (width === 393)
          await page.screenshot({
            path: path.join(
              __dirname,
              `../../.local/dashboard-${role}-mobile.png`,
            ),
          });
        console.log(
          `${role} dashboard ${width}px: global counts, filtered pagination, action refresh passed`,
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
