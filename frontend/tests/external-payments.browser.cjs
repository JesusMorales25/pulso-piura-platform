/* eslint-disable @typescript-eslint/no-require-imports -- Standalone local browser verification. */
const { chromium } = require("@playwright/test");
const axe = require("axe-core");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const base = process.env.A11Y_BASE_URL || "http://localhost:3002";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER;
  const client = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
  assert.ok(
    issuer && client,
    "Use the public OIDC settings of the local tested build.",
  );
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.A11Y_BROWSER_CHANNEL
      ? { channel: process.env.A11Y_BROWSER_CHANNEL }
      : {}),
  });
  const results = [];
  const id = "12345678-1234-1234-1234-123456789abc";
  const reservationId = "22345678-1234-1234-1234-123456789abc";
  const secondOrganizationId = "32345678-1234-1234-1234-123456789abc";
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
    "base64",
  );
  try {
    for (const width of [320, 393, 768]) {
      for (const role of ["payer", "owner"]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          bypassCSP: true,
          reducedMotion: "reduce",
        });
        const claims = { sub: `external-test-${role}`, roles: [] };
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
        if (role === "payer") await page.clock.install();
        const destination = {
          holderName: "Receptor de prueba",
          phone: "987654321",
          yapeEnabled: true,
          plinEnabled: true,
          configured: true,
          version: "snapshot-version-1",
        };
        const reservation = {
          id: reservationId,
          sportSpaceId: id,
          venueName: "Complejo de prueba",
          spaceName: "Cancha de prueba",
          startsAt: new Date(Date.now() + 86400000).toISOString(),
          endsAt: new Date(Date.now() + 90000000).toISOString(),
          expiresAt: new Date(Date.now() + 900000).toISOString(),
          status: role === "owner" ? "PENDING_PAYMENT_CONFIRMATION" : "HOLD",
          totalMinor: 10000,
          depositMinor: 2000,
          paidMinor: 0,
          currency: "PEN",
          version: 0,
        };
        let proofs =
          role === "owner"
            ? [
                {
                  id,
                  targetType: "RESERVATION",
                  targetId: reservationId,
                  payerUserId: id,
                  payerName: "Jugador de prueba",
                  amountMinor: 2000,
                  currency: "PEN",
                  method: "YAPE",
                  plan: "DEPOSIT",
                  status: "PENDING_REVIEW",
                  reference: "REF-TEST",
                  ...destination,
                  createdAt: new Date().toISOString(),
                  reviewExpiresAt: new Date(Date.now() + 900000).toISOString(),
                  reviewedAt: null,
                  reviewNote: null,
                  canReview: true,
                  hasImage: true,
                },
              ]
            : [];
        let uploaded = 0;
        let preparedCalls = 0;
        let clockOffset = 0;
        let saved = false;
        let imageRequested = false;
        let reviewed = false;
        let conflict = true;
        let reservationListRequests = 0;
        // Prevent all remote access. API requests are handled as synthetic local fixtures.
        await page.route("**/*", async (route) => {
          const request = route.request();
          const url = new URL(request.url());
          if (!url.pathname.startsWith("/api/v1/")) {
            if (["localhost", "127.0.0.1"].includes(url.hostname))
              return route.continue();
            return route.abort();
          }
          const endpoint = url.pathname.replace("/api/v1", "");
          const json = (data, status = 200) =>
            route.fulfill({
              status,
              contentType: "application/json",
              body: JSON.stringify(data),
            });
          if (endpoint === "/me")
            return json({
              id,
              email: "test@example.test",
              emailVerified: true,
              displayName: "Persona de prueba",
              avatarUrl: null,
              status: "ACTIVE",
              onboardingStatus: "COMPLETE",
              platformAdmin: false,
            });
          if (endpoint === "/me/profile")
            return json({
              userId: id,
              preferredDisplayName: "Persona de prueba",
              homeDistrictCode: "",
              bio: "",
              avatarUrl: null,
              visibility: "PRIVATE",
              onboardingStatus: "COMPLETE",
            });
          if (endpoint === "/organizations")
            return json(
              role === "owner"
                ? [
                    { id, name: "Complejo de prueba", role: "OWNER" },
                    {
                      id: secondOrganizationId,
                      name: "Segundo complejo",
                      role: "OWNER",
                    },
                  ]
                : [],
            );
          if (endpoint === "/me/capability-requests")
            return json(
              role === "owner"
                ? [{ capability: "VENUE_OWNER", status: "APPROVED" }]
                : [],
            );
          if (endpoint === "/external-payments/capabilities")
            return json({ enabled: true, reviewMinutes: 15 });
          if (endpoint === "/payment-orders/capabilities")
            return json({ simulationEnabled: false });
          if (endpoint === "/payment-orders") return json([]);
          if (endpoint === `/reservations/${reservationId}`)
            return json({
              ...reservation,
              status: proofs.some(
                (p) =>
                  p.targetType === "RESERVATION" &&
                  p.status === "PENDING_REVIEW",
              )
                ? "PENDING_PAYMENT_CONFIRMATION"
                : reservation.status,
            });
          if (endpoint === "/me/reservations")
            return json({ items: [reservation], page: 0, size: 10, total: 1 });
          if (endpoint === "/matches/participations/me")
            return json([
              {
                id,
                publicSlug: "partido-retirado",
                title: "Pago de partido retirado",
                formatCode: "FOOTBALL_7",
                spaceName: "Cancha de prueba",
                venueName: "Complejo de prueba",
                venueAddress: "Dirección de prueba",
                startsAt: reservation.startsAt,
                endsAt: reservation.endsAt,
                participationStatus: "PENDING_REVIEW",
                paymentStatus: "PENDING_REVIEW",
                paidMinor: 0,
                currency: "PEN",
                checkedInAt: null,
              },
            ]);
          if (endpoint.endsWith("/reservations/dashboard")) {
            const second = endpoint.includes(secondOrganizationId);
            const confirmed = proofs.some(
              (proof) => proof.status === "CONFIRMED",
            );
            const count = second ? 0 : role === "owner" && !saved ? 0 : 1;
            const row = {
              ...reservation,
              status: confirmed ? "CONFIRMED" : "PENDING_PAYMENT_CONFIRMATION",
              paidMinor: confirmed ? 2000 : 0,
              spaceName: "Cancha de prueba",
              venueName: "Complejo de prueba",
              customerEmail: "test@example.test",
            };
            const filter = url.searchParams.get("filter");
            if (filter) reservationListRequests++;
            const matchFilter =
              filter === "ALL" ||
              (confirmed &&
                ["CONFIRMED", "PAID", "BALANCE"].includes(filter)) ||
              (!confirmed && filter === "PENDING_PAYMENT_CONFIRMATION");
            return json({
              counts: {
                all: count,
                confirmed: confirmed ? count : 0,
                pendingPayment: 0,
                pendingConfirmation: confirmed ? 0 : count,
                cancelled: 0,
                completed: 0,
                expired: 0,
                paid: confirmed ? count : 0,
                balance: confirmed ? count : 0,
              },
              paidMinor: confirmed ? 2000 : 0,
              balanceMinor: confirmed ? 8000 : 0,
              retainedMinor: 0,
              items: filter && count && matchFilter ? [row] : [],
              total: filter && matchFilter ? count : 0,
              page: 0,
              size: 10,
            });
          }
          if (endpoint === `/organizations/${id}/reservations`) {
            reservationListRequests++;
            return json({
              items: saved ? [reservation] : [],
              total: saved ? 1 : 0,
            });
          }
          if (
            endpoint === `/organizations/${secondOrganizationId}/reservations`
          )
            return json({ items: [], total: 0 });
          if (endpoint.endsWith("/reservations/summary"))
            return json({
              total: 1,
              confirmed: 0,
              pending: 1,
              cancelled: 0,
              paidMinor: 0,
              balanceMinor: 10000,
              retainedMinor: 0,
            });
          if (endpoint.endsWith("/schedule")) return json([]);
          if (
            endpoint === `/organizations/${id}/external-payment-destination`
          ) {
            if (request.method() === "PUT") {
              const body = request.postDataJSON();
              assert.equal(body.holderName, "Cuenta actualizada");
              assert.equal(body.phone, "912345678");
              saved = true;
              return json({
                ...destination,
                ...body,
                version: "snapshot-version-2",
              });
            }
            return json(destination);
          }
          if (endpoint === "/external-payments/destination")
            return json(destination);
          if (endpoint === "/external-payments/prepare") {
            assert.deepEqual(request.postDataJSON(), {
              targetType: "RESERVATION",
              targetId: reservationId,
              method: "YAPE",
              plan: "DEPOSIT",
            });
            assert.ok(request.headers()["idempotency-key"]);
            preparedCalls++;
            return json({
              amountMinor: 2000,
              currency: "PEN",
              expiresAt: new Date(
                Date.now() + clockOffset + 300000,
              ).toISOString(),
              destination,
            });
          }
          if (
            endpoint ===
            `/organizations/${secondOrganizationId}/external-payment-destination`
          )
            return json({
              ...destination,
              holderName: "Otro receptor",
              phone: "911222333",
              version: "other-account",
            });
          if (
            endpoint === "/external-payments" &&
            request.method() === "POST"
          ) {
            const multipart = request.postDataBuffer().toString("latin1");
            assert.match(
              multipart,
              /name="destinationVersion"\r\n\r\nsnapshot-version-1/,
            );
            assert.match(multipart, /name="targetType"\r\n\r\nRESERVATION/);
            assert.match(multipart, /name="plan"\r\n\r\nDEPOSIT/);
            assert.match(multipart, /name="file"; filename="receipt.png"/);
            assert.ok(request.headers()["idempotency-key"]);
            assert.equal(
              request.headers().authorization,
              `Bearer ${user.access_token}`,
            );
            uploaded++;
            if (conflict) {
              conflict = false;
              return json({ detail: "La cuenta receptora cambió." }, 409);
            }
            proofs = [
              {
                id,
                targetType: "RESERVATION",
                targetId: reservationId,
                payerUserId: id,
                payerName: "Persona de prueba",
                amountMinor: 2000,
                currency: "PEN",
                method: "YAPE",
                plan: "DEPOSIT",
                status: "PENDING_REVIEW",
                reference: "REF-TEST",
                ...destination,
                createdAt: new Date().toISOString(),
                reviewExpiresAt: new Date(Date.now() + 900000).toISOString(),
                reviewedAt: null,
                reviewNote: null,
                canReview: false,
                hasImage: true,
              },
            ];
            return json(proofs[0], 201);
          }
          if (endpoint === "/external-payments")
            return json(
              url.searchParams.get("targetType") === "MATCH"
                ? proofs.map((proof) => ({
                    ...proof,
                    targetType: "MATCH",
                    targetId: id,
                  }))
                : proofs,
            );
          if (endpoint === `/external-payments/${id}/image`) {
            assert.equal(
              request.headers().authorization,
              `Bearer ${user.access_token}`,
            );
            imageRequested = true;
            return route.fulfill({
              status: 200,
              contentType: "image/png",
              headers: { "Cache-Control": "no-store" },
              body: png,
            });
          }
          if (endpoint === `/external-payments/${id}/decision`) {
            assert.deepEqual(request.postDataJSON(), {
              decision: "CONFIRMED",
              note: "Verificado en la cuenta receptora",
            });
            reviewed = true;
            proofs = proofs.map((proof) => ({
              ...proof,
              status: "CONFIRMED",
              canReview: false,
            }));
            return json(proofs[0]);
          }
          return json([]);
        });
        if (role === "payer") {
          await page.goto(`${base}/actividad?reservation=${reservationId}`);
          const panel = page.getByRole("region", {
            name: "Pago por Yape o Plin",
          });
          await panel
            .getByRole("button", { name: "Preparar pago", exact: true })
            .waitFor();
          assert.equal(
            await panel.getByText("Celular: 987654321").count(),
            0,
            "Do not expose transfer instructions before the server holds availability.",
          );
          await panel
            .getByRole("button", { name: "Preparar pago", exact: true })
            .click();
          await panel.getByText("Celular: 987654321").waitFor();
          assert.equal(preparedCalls, 1);
          const amount = panel
            .getByRole("status")
            .filter({ hasText: "Importe verificado" })
            .locator("strong");
          assert.equal(
            await amount.evaluate((el) => getComputedStyle(el).whiteSpace),
            "nowrap",
          );
          assert.equal(
            await amount.evaluate((el) => el.getClientRects().length),
            1,
          );
          assert.equal(
            await panel
              .getByRole("combobox", { name: "Método", exact: true })
              .evaluate((el) => getComputedStyle(el).minHeight),
            "44px",
          );

          assert.match(
            await panel
              .getByRole("status")
              .filter({ hasText: "Importe verificado" })
              .textContent(),
            /20[.,]00/,
          );
          await panel
            .getByLabel("Número de operación (opcional)")
            .fill("REF-TEST");
          await panel.getByLabel(/Captura del comprobante/).setInputFiles({
            name: "receipt.png",
            mimeType: "image/png",
            buffer: png,
          });
          await panel.getByRole("checkbox").check();
          clockOffset = 301000;
          await page.clock.fastForward(clockOffset);
          await panel
            .getByRole("alert")
            .filter({ hasText: "La preparación venció" })
            .waitFor();
          assert.equal(await panel.getByText("Celular: 987654321").count(), 0);
          assert.equal(
            await panel
              .getByRole("button", { name: "Enviar para validación" })
              .isDisabled(),
            true,
          );
          assert.equal(
            await panel
              .getByLabel(/Captura del comprobante/)
              .evaluate((input) => input.files.length),
            1,
          );
          assert.equal(
            await panel
              .getByLabel("Número de operación (opcional)")
              .inputValue(),
            "REF-TEST",
          );
          await panel
            .getByRole("button", { name: "Actualizar preparación" })
            .click();
          await panel.getByText("Celular: 987654321").waitFor();
          await panel
            .getByRole("button", { name: "Enviar para validación" })
            .click();
          await panel
            .getByRole("alert")
            .filter({ hasText: "No vuelvas a transferir" })
            .waitFor();
          assert.equal(
            await panel
              .getByLabel("Número de operación (opcional)")
              .inputValue(),
            "REF-TEST",
          );
          assert.equal(
            await panel
              .getByLabel(/Captura del comprobante/)
              .evaluate((input) => input.files.length),
            1,
          );
          await panel
            .getByRole("button", { name: "Enviar para validación" })
            .click();
          await panel
            .getByRole("heading", { name: "Enviado, pendiente de validación" })
            .waitFor();
          assert.equal(uploaded, 2);
          assert.equal(
            await page
              .getByText("Reserva confirmada.", { exact: false })
              .count(),
            0,
          );
          assert.equal(
            await page.getByRole("button", { name: /Simular pago/ }).count(),
            0,
          );
          await page
            .getByRole("dialog", { name: "Tu reserva", exact: true })
            .getByRole("button", { name: "Cerrar formulario" })
            .click();
          await page
            .locator(".focusedReservationList > .card")
            .getByText(/Pendiente de confirmación de pago/)
            .waitFor();
          await page.goto(`${base}/actividad`);
          await page
            .getByRole("button", { name: /^Por confirmar pago/ })
            .click();
          await page
            .getByRole("button", {
              name: /Pago de partido retirado.*Ver inscripción/,
            })
            .click();
          await page
            .getByText("Solicitud en revisión", { exact: false })
            .waitFor();
          await page
            .getByRole("heading", { name: "Historial de pago" })
            .waitFor();
          await page
            .getByRole("heading", { name: "Enviado, pendiente de validación" })
            .waitFor();
        } else {
          await page.goto(`${base}/reservas-cancha`);
          assert.equal(
            await page
              .getByRole("heading", {
                name: "Cuenta receptora del complejo",
                exact: true,
              })
              .count(),
            0,
          );
          assert.equal(reservationListRequests, 0);
          await page
            .getByRole("button", { name: "Reservas y pagos", exact: true })
            .click();
          const settings = page
            .getByRole("region", { name: "Revisión de pagos externos" })
            .filter({
              has: page.getByRole("heading", {
                name: "Cuenta receptora del complejo",
              }),
            });
          await settings
            .getByRole("button", {
              name: "Editar cuenta receptora",
              exact: true,
            })
            .click();
          await settings
            .getByRole("dialog", { name: "Cuenta receptora", exact: true })
            .waitFor();
          await settings
            .getByLabel("Titular", { exact: true })
            .fill("Cuenta actualizada");
          await settings.getByLabel("Celular peruano").fill("912345678");
          await settings
            .getByRole("button", { name: "Guardar cuenta receptora" })
            .click();
          assert.equal(
            saved,
            false,
            "Changing the recipient requires explicit confirmation.",
          );
          if (width === 393)
            await page.screenshot({
              path: path.join(
                __dirname,
                "../../.local/payment-destination-dialog-mobile.png",
              ),
            });
          await settings
            .getByRole("checkbox", { name: /Confirmo que el titular/ })
            .check();
          await settings
            .getByRole("button", { name: "Guardar cuenta receptora" })
            .click();
          await settings.getByText("Celular: 912345678").waitFor();
          assert.equal(saved, true);
          await page
            .locator(".ownerOrganizationPicker select")
            .selectOption(secondOrganizationId);
          await settings.getByText("Celular: 911222333").waitFor();
          assert.equal(
            await settings.getByText("Celular: 912345678").count(),
            0,
            "Switching organizations must clear the previous recipient snapshot.",
          );
          await page
            .locator(".ownerOrganizationPicker select")
            .selectOption(id);

          await page
            .getByRole("button", { name: "Reservas y pagos", exact: true })
            .click();
          await page
            .getByRole("button", { name: /^Por confirmar pago/ })
            .click();
          await page
            .getByRole("button", { name: /Cancha de prueba.*Ver reserva/ })
            .click();
          const review = page
            .getByRole("region", { name: "Revisión de pagos externos" })
            .filter({
              has: page.getByRole("heading", { name: "Pagos por validar" }),
            });
          assert.equal(
            await page
              .getByRole("button", {
                name: /Editar cuenta receptora|Configurar cuenta receptora/,
              })
              .count(),
            1,
            "Only the organization settings can edit a reservation recipient.",
          );
          assert.equal(
            await review
              .getByRole("button", { name: /cuenta receptora/ })
              .count(),
            0,
          );
          await review.getByRole("button", { name: "Ver comprobante" }).click();
          const dialog = page.getByRole("dialog", {
            name: "Comprobante de pago",
          });
          await dialog.waitFor();
          assert.match(
            await dialog.getByRole("img").getAttribute("src"),
            /^blob:/,
          );
          assert.equal(imageRequested, true);
          await page.keyboard.press("Escape");
          await review
            .getByLabel("Motivo de la decisión")
            .fill("Verificado en la cuenta receptora");
          await review
            .getByRole("button", { name: "Registrar decisión" })
            .click();
          await review
            .getByRole("heading", { name: "Pago confirmado" })
            .waitFor();
          assert.equal(reviewed, true);
        }
        await page.addScriptTag({ content: axe.source });
        const violations = await page.evaluate(async () =>
          (
            await window.axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
              },
            })
          ).violations.map(({ id, nodes }) => ({
            id,
            targets: nodes.map((node) => node.target),
          })),
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        if (overflow)
          console.log(
            await page.evaluate(() =>
              [...document.querySelectorAll("main *")]
                .map((element) => ({
                  tag: element.tagName,
                  className: element.className,
                  right: element.getBoundingClientRect().right,
                  width: element.getBoundingClientRect().width,
                }))
                .filter((item) => item.right > innerWidth + 1)
                .slice(0, 25),
            ),
          );
        results.push({ role, width, overflow, violations });
        console.log(
          `${role} ${width}px workflow passed; overflow=${overflow}; axe=${violations.length}`,
        );
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const output = path.join(
    __dirname,
    "../../.verification/external-payments-browser-results.json",
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  assert.equal(
    results.some((result) => result.overflow || result.violations.length),
    false,
    JSON.stringify(results),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
