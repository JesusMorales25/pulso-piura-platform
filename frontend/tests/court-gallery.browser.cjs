/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic gallery workflow. */
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
        sub: "gallery-owner",
        name: "Owner",
        email: "owner@example.test",
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
      const org = "12345678-1234-1234-1234-123456789abc",
        venue = "22345678-1234-1234-1234-123456789abc",
        space = "32345678-1234-1234-1234-123456789abc";
      let photos = [];
      let fail = true;
      let counter = 0;
      const organization = {
        id: org,
        name: "Complejo galería",
        slug: "gallery",
        status: "ACTIVE",
        role: "OWNER",
        address: "Av. Piura 123",
        districtCode: "Piura",
      };
      const court = {
        id: space,
        venueId: venue,
        name: "Cancha galería",
        sportCode: "FOOTBALL",
        formatCode: "FOOTBALL_7",
        capacity: 14,
        indoor: false,
        amenityCodes: [],
        status: "PUBLISHED",
        version: 0,
      };
      const page = await context.newPage();
      await page.route("**/*", async (route) => {
        const u = new URL(route.request().url());
        if (!u.pathname.startsWith("/api/v1/"))
          return ["localhost", "127.0.0.1"].includes(u.hostname)
            ? route.continue()
            : route.abort();
        const p = u.pathname.replace("/api/v1", "");
        let data = [];
        const method = route.request().method();
        if (p === "/me")
          data = {
            id: org,
            displayName: "Owner",
            email: profile.email,
            emailVerified: true,
            status: "ACTIVE",
            onboardingStatus: "COMPLETE",
          };
        else if (p === "/me/profile")
          data = { userId: org, onboardingStatus: "COMPLETE" };
        else if (p === "/me/capability-requests")
          data = [{ capability: "VENUE_OWNER", status: "APPROVED" }];
        else if (p === "/organizations") data = [organization];
        else if (p === "/organizations/" + org) data = organization;
        else if (p.endsWith("/districts")) data = ["Piura"];
        else if (p === "/venue-catalogs")
          data = {
            sports: [{ code: "FOOTBALL", name: "Fútbol" }],
            formats: [
              { code: "FOOTBALL_7", name: "Fútbol 7", sportCode: "FOOTBALL" },
            ],
            surfaces: [],
            amenities: [],
          };
        else if (p === "/organizations/" + org + "/venues")
          data = [
            {
              id: venue,
              name: "Sede galería",
              address: "Av. Piura",
              districtCode: "Piura",
              status: "PUBLISHED",
              amenityCodes: [],
            },
          ];
        else if (p === "/organizations/" + org + "/venues/" + venue + "/spaces")
          data = [court];
        else if (p.endsWith("/photos") && p.startsWith("/organizations/")) {
          assert.equal(route.request().headers().authorization, "Bearer test");
          if (method === "POST") {
            if (fail) {
              fail = false;
              return route.fulfill({
                status: 503,
                contentType: "application/json",
                body: JSON.stringify({ detail: "Error temporal de prueba" }),
              });
            }
            const photo = {
              id: "photo-" + ++counter,
              caption: "Foto " + counter,
              cover: photos.length === 0,
              position: counter,
              imageUrl: "/untrusted/ignored",
            };
            photos.push(photo);
            data = photo;
          } else data = photos;
        } else if (p.includes("/photos/") && p.endsWith("/cover")) {
          const id = p.split("/").at(-2);
          photos = photos.map((photo) => ({
            ...photo,
            cover: photo.id === id,
          }));
          data = photos.find((photo) => photo.id === id);
        } else if (p.includes("/photos/") && method === "DELETE") {
          const id = p.split("/").at(-1);
          photos = photos.filter((photo) => photo.id !== id);
          if (!photos.some((photo) => photo.cover) && photos[0])
            photos[0].cover = true;
          return route.fulfill({ status: 204 });
        } else if (p.endsWith("/image"))
          return route.fulfill({ contentType: "image/png", body: png });
        else if (p === "/venues")
          data = {
            items: [
              {
                publicSlug: "gallery",
                name: "Complejo galería",
                address: "Av. Piura",
                districtCode: "Piura",
                publicPhone: null,
                latitude: null,
                longitude: null,
                amenityCodes: [],
                adminRating: null,
                adminRatingCount: null,
              },
            ],
            page: 0,
            size: 20,
            total: 1,
          };
        else if (p === "/venues/gallery/spaces") data = [court];
        else if (p.endsWith("/bookable-slots"))
          data = {
            sportSpaceId: space,
            timezone: "America/Lima",
            date: "2099-10-24",
            slots: [
              {
                startsAt: "2099-10-24T20:00:00Z",
                endsAt: "2099-10-24T21:00:00Z",
                priceMinor: 6000,
                currency: "PEN",
              },
            ],
          };
        else if (p === "/public/spaces/" + space + "/photos") {
          assert.equal(route.request().headers().authorization, undefined);
          data = photos;
        }
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      await page.goto(
        base + "/admin/" + org + "?venueId=" + venue + "&spaceId=" + space,
      );
      await page
        .getByRole("button", { name: "Volver a canchas", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Fotos de cancha", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Fotos de Cancha galería",
        exact: true,
      });
      await dialog
        .getByLabel("Foto", { exact: true })
        .setInputFiles({
          name: "court.png",
          mimeType: "image/png",
          buffer: png,
        });
      await dialog
        .getByRole("button", { name: "Subir foto", exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toContainText("Error temporal");
      assert.equal(
        await dialog
          .getByLabel("Foto", { exact: true })
          .evaluate((input) => input.files.length),
        1,
        "Failed upload must keep selected file",
      );
      for (let i = 1; i <= 3; i++) {
        if (i > 1)
          await dialog
            .getByLabel("Foto", { exact: true })
            .setInputFiles({
              name: "court.png",
              mimeType: "image/png",
              buffer: png,
            });
        await dialog
          .getByRole("button", { name: "Subir foto", exact: true })
          .click();
        await expect(
          dialog.getByRole("button", { name: new RegExp("^Ver foto " + i) }),
        ).toBeVisible();
      }
      await dialog.getByRole("button", { name: /^Ver foto 3/ }).click();
      await dialog
        .getByRole("button", { name: "Elegir como portada", exact: true })
        .click();
      await expect(
        dialog.getByRole("button", {
          name: "Ver foto 3, portada",
          exact: true,
        }),
      ).toBeVisible();
      await dialog
        .getByRole("button", { name: "Ver foto 3, portada", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Eliminar foto", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Conservar foto", exact: true })
        .click();
      assert.equal(photos.length, 3);
      await dialog
        .getByRole("button", { name: "Eliminar foto", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Eliminar foto definitivamente", exact: true })
        .click();
      await expect.poll(() => photos.length).toBe(2);
      assert.equal(photos.filter((photo) => photo.cover).length, 1);
      await dialog
        .getByRole("button", { name: "Cerrar formulario", exact: true })
        .click();
      await page.goto(base + "/canchas");
      await page
        .getByRole("button", { name: "Ver fotos", exact: true })
        .first()
        .click();
      const publicGallery = page.getByRole("dialog", {
        name: "Fotos de Cancha galería",
        exact: true,
      });
      await expect(
        publicGallery.getByRole("button", { name: /^Ver foto 2/ }),
      ).toBeVisible();
      await expect(
        publicGallery.getByRole("button", { name: "Subir foto", exact: true }),
      ).toHaveCount(0);
      await publicGallery
        .getByRole("button", { name: "Foto siguiente", exact: true })
        .click();
      await expect(
        publicGallery.getByRole("button", { name: /^Ver foto 2/ }),
      ).toHaveAttribute("aria-pressed", "true");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: require("node:path").join(
          __dirname,
          "../../.local/court-gallery-" + width + ".png",
        ),
      });
      console.log(
        "PASS: gallery " +
          width +
          "px three uploads/retry preserved/cover/delete/public/no overflow",
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
