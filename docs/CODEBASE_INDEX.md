# Indice operativo del codigo

> Generado automaticamente. No editar a mano.
> Actualizar: powershell -ExecutionPolicy Bypass -File scripts/update-codebase-index.ps1

- Generado: 2026-09-21 07:05:20 UTC
- Huella del inventario: 844f574199a955cc
- Archivos indexados: 536
- Excluye .env, node_modules, .next, target, build, Git y artefactos temporales.

## Uso

1. Leer este archivo antes de explorar el repositorio.
2. Ir al area indicada en la tabla de enrutamiento.
3. Usar rg solo dentro del alcance relacionado con la tarea.
4. Leer los documentos obligatorios y ADR aplicables; este indice no los reemplaza.
5. Regenerarlo tras cambiar rutas, modulos, controladores, migraciones o scripts.

## Arquitectura estable

- SaaS multicomplejo y web responsive mobile-first.
- Frontend Next.js, React y TypeScript.
- Backend Java 21 y Spring Boot como monolito modular.
- Proveedor OIDC configurable; Google sera una conexion federada.
- PostgreSQL y Flyway; no editar migraciones aplicadas.
- Dinero en unidad minima; UTC en datos y America/Lima en presentacion.
- Reservas y pagos: transaccion, idempotencia, auditoria y control de concurrencia.
- Organizaciones: validar actor, pertenencia, permiso y tenant en backend.

## Enrutamiento por tarea

| Area | Frontend | Backend | Documentacion inicial |
|---|---|---|---|
| Inicio y navegacion | frontend/features/home, frontend/features/navigation | - | DESIGN.md, docs/product/24_flujos_ux.md |
| Sesion y perfil | frontend/features/auth, frontend/app/perfil | identity, profiles | docs/product/10_autenticacion_autorizacion.md, docs/product/16_inicio_sesion_google.md |
| Organizaciones | frontend/features/organizations, frontend/app/admin | organizations | docs/product/11_matriz_roles_permisos.md |
| Complejos y canchas | frontend/features/venues | venues | docs/product/27_panel_complejos.md, docs/ITERATION_3_VENUES_PLAN.md |
| Reservas | frontend/features/reservations, PublicVenueCatalog.tsx | reservations | docs/product/25_reglas_reservas.md, docs/RESERVATIONS_PAYMENTS.md |
| Pagos | ReservationCheckout.tsx | payments | docs/product/32_pagos_yape_plin.md, docs/adr/ADR-005-pagos-desacoplados.md |
| Partidos | frontend/features/matches, frontend/app/partidos | matches | docs/product/26_reglas_partidos.md |
| Infraestructura | frontend/lib | foundation, shared | README.md, compose.yaml, docs/IDENTITY_LOCAL_SETUP.md |

## Frontend

### Rutas

- /actividad -> frontend/app/actividad/page.tsx
- /admin/[orgId] -> frontend/app/admin/[orgId]/page.tsx
- /auth/callback -> frontend/app/auth/callback/page.tsx
- /canchas -> frontend/app/canchas/page.tsx
- /crear -> frontend/app/crear/page.tsx
- /invitaciones/[invitationId] -> frontend/app/invitaciones/[invitationId]/page.tsx
- /organizaciones -> frontend/app/organizaciones/page.tsx
- /organizador -> frontend/app/organizador/page.tsx
- / -> frontend/app/page.tsx
- /partidos/[publicSlug] -> frontend/app/partidos/[publicSlug]/page.tsx
- /partidos/demo-futbol-7 -> frontend/app/partidos/demo-futbol-7/page.tsx
- /partidos/demo-voley -> frontend/app/partidos/demo-voley/page.tsx
- /partidos/invitaciones/[invitationId] -> frontend/app/partidos/invitaciones/[invitationId]/page.tsx
- /partidos -> frontend/app/partidos/page.tsx
- /perfil -> frontend/app/perfil/page.tsx
- /plataforma/negocios -> frontend/app/plataforma/negocios/page.tsx
- /plataforma/organizaciones -> frontend/app/plataforma/organizaciones/page.tsx
- /plataforma -> frontend/app/plataforma/page.tsx
- /plataforma/solicitudes -> frontend/app/plataforma/solicitudes/page.tsx
- /tercer-tiempo -> frontend/app/tercer-tiempo/page.tsx

### Features y archivos

- access (2): capabilities.ts, useUserCapabilities.ts
- activity (1): ActivityDashboard.tsx
- auth (2): AuthButton.tsx, AuthProvider.tsx
- feedback (1): CardSkeletons.tsx
- home (12): FeaturedMatchCard.module.css, FeaturedMatchCard.tsx, FeaturedMatchCardV2.module.css, FeaturedMatchCardV2.tsx, HomeDashboard.tsx, HomeModeSwitch.tsx, HomeVenuePreview.tsx, MatchDiscoveryPanel.tsx, NextMatchCard.module.css, NextMatchCard.tsx, ThirdTimeSection.tsx, VenueAgendaPanel.tsx
- matches (11): DemoMatchBuilder.tsx, DemoMatchDetail.tsx, MatchBuilder.tsx, MatchCatalog.tsx, MatchCheckInScanner.tsx, MatchDetail.tsx, MatchInvitationAcceptance.tsx, MatchOrganizerDashboard.tsx, MatchQrPass.tsx, MyMatchParticipations.tsx, types.ts
- navigation (1): AppNavigation.tsx
- organizations (3): InvitationAcceptance.tsx, OrganizationAdmin.tsx, OrganizationWorkspace.tsx
- reservations (7): MyReservations.tsx, OrganizationReservations.tsx, presentation.ts, ReservationCheckInScanner.tsx, ReservationCheckout.tsx, ReservationQrPass.tsx, types.ts
- venues (3): AvailabilityAdmin.tsx, PublicVenueCatalog.tsx, VenueAdmin.tsx

### Compartido

- frontend/lib/api.ts: cliente HTTP y errores.
- frontend/lib/oidc.ts: cliente OIDC.
- frontend/lib/auth-session.ts: sesion.
- frontend/app/styles.css: estilos globales y responsive.
- frontend/AGENTS.md: reglas de la version instalada de Next.js.

## Backend

### Modulos

- audit: 6 clases, 0 pruebas.
- foundation: 5 clases, 2 pruebas.
- identity: 13 clases, 2 pruebas.
- matches: 36 clases, 8 pruebas.
- organizations: 20 clases, 5 pruebas.
- partners: 2 clases, 2 pruebas.
- payments: 11 clases, 1 pruebas.
- profiles: 6 clases, 0 pruebas.
- reservations: 40 clases, 10 pruebas.
- shared: 1 clases, 0 pruebas.
- venues: 44 clases, 7 pruebas.

### Controladores y endpoints declarados

- /api/v1 | backend/src/main/java/com/pulsopiura/platform/foundation/web/HealthController.java | GET /health
- /api/v1/me | backend/src/main/java/com/pulsopiura/platform/identity/api/MeController.java | GET; GET /profile; PATCH /profile; GET /capability-requests; POST /capability-requests
- /api/v1/platform | backend/src/main/java/com/pulsopiura/platform/identity/api/PlatformAdminController.java | GET /summary; GET /users; GET /capability-requests; POST /capability-requests/{requestId}/review; POST /capability-requests/{requestId}/revoke
- /api/v1/matches | backend/src/main/java/com/pulsopiura/platform/matches/api/MatchController.java | GET; GET /{publicSlug:[a-z0-9-]+}; GET /mine; GET /{matchId:[0-9a-fA-F-]{36}}/participants; DELETE /{matchId:[0-9a-fA-F-]{36}}/participants/{userId:[0-9a-fA-F-]{36}}; GET /participations/me; POST /{publicSlug:[a-z0-9-]+}/check-in-pass; POST /{matchId:[0-9a-fA-F-]{36}}/check-in/preview; POST /{matchId:[0-9a-fA-F-]{36}}/check-in; GET /{publicSlug:[a-z0-9-]+}/participants/me; GET /join-orders/capabilities; GET /{publicSlug:[a-z0-9-]+}/join-orders/me; POST /{publicSlug:[a-z0-9-]+}/join-orders; POST /join-orders/{orderId:[0-9a-fA-F-]{36}}/simulate; POST; POST /{matchId:[0-9a-fA-F-]{36}}/publish; GET /{matchId:[0-9a-fA-F-]{36}}/invitations; POST /{matchId:[0-9a-fA-F-]{36}}/invitations; DELETE /{matchId:[0-9a-fA-F-]{36}}/invitations/{invitationId:[0-9a-fA-F-]{36}}; POST /invitations/{invitationId:[0-9a-fA-F-]{36}}/accept; POST /{publicSlug:[a-z0-9-]+}/participants/me; DELETE /{publicSlug:[a-z0-9-]+}/participants/me
- /api/v1/organizations | backend/src/main/java/com/pulsopiura/platform/organizations/api/OrganizationController.java | POST; GET; GET /{organizationId}; POST /{organizationId}/invitations; POST /invitations/{invitationId}/accept; GET /{organizationId}/members; DELETE /{organizationId}/members/{userId}
- /api/v1/platform/organizations | backend/src/main/java/com/pulsopiura/platform/organizations/api/PlatformOrganizationAdminController.java | GET; POST /{organizationId}/owners; DELETE /{organizationId}/owners/{userId}
- sin prefijo | backend/src/main/java/com/pulsopiura/platform/partners/api/PartnerBusinessController.java | GET /api/v1/businesses; GET /api/v1/businesses/{businessId}/image; GET /api/v1/platform/businesses; POST /api/v1/platform/businesses; PUT /api/v1/platform/businesses/{businessId}; PUT
- /api/v1/payment-orders | backend/src/main/java/com/pulsopiura/platform/payments/api/PaymentOrderController.java | GET /capabilities; GET; GET /{orderId}; POST; POST /{orderId}/simulate
- /api/v1/spaces/{spaceId}/bookable-slots | backend/src/main/java/com/pulsopiura/platform/reservations/api/BookableAvailabilityController.java | GET
- /api/v1/me/reservations | backend/src/main/java/com/pulsopiura/platform/reservations/api/MyReservationController.java | GET
- /api/v1/organizations/{organizationId}/reservations | backend/src/main/java/com/pulsopiura/platform/reservations/api/OrganizationReservationController.java | POST /{reservationId}/cancel; GET /summary; GET
- /api/v1 | backend/src/main/java/com/pulsopiura/platform/reservations/api/ReservationCheckInController.java | POST /reservations/{reservationId}/check-in-pass; POST /organizations/{organizationId}/reservations/check-in/preview; POST /organizations/{organizationId}/reservations/check-in
- /api/v1/reservations | backend/src/main/java/com/pulsopiura/platform/reservations/api/ReservationController.java | GET /{reservationId}; POST /{reservationId}/confirm; POST /{reservationId}/cancel; POST
- /api/v1/organizations/{organizationId}/spaces/{spaceId} | backend/src/main/java/com/pulsopiura/platform/venues/api/AvailabilityController.java | POST /availability-rules; GET /availability-rules; DELETE /availability-rules/{ruleId}; POST /exceptions; GET /exceptions; DELETE /exceptions/{exceptionId}
- /api/v1 | backend/src/main/java/com/pulsopiura/platform/venues/api/PublicVenueController.java | GET /venues; GET /venues/{publicSlug}; GET /venues/{publicSlug}/spaces; GET /spaces/{spaceId}/availability
- /api/v1/organizations/{organizationId}/spaces | backend/src/main/java/com/pulsopiura/platform/venues/api/SportSpaceController.java | PUT /{spaceId}; POST /{spaceId}/publish; DELETE /{spaceId}
- /api/v1/venue-catalogs | backend/src/main/java/com/pulsopiura/platform/venues/api/VenueCatalogController.java | GET
- /api/v1/organizations/{organizationId}/venues | backend/src/main/java/com/pulsopiura/platform/venues/api/VenueController.java | POST; GET; PUT /{venueId}; POST /{venueId}/publish; DELETE /{venueId}; POST /{venueId}/spaces; GET /{venueId}/spaces

### Migraciones Flyway

- backend/src/main/resources/db/migration/V1__initialize_app_schema.sql
- backend/src/main/resources/db/migration/V2__create_identity_and_profiles.sql
- backend/src/main/resources/db/migration/V3__create_identity_audit.sql
- backend/src/main/resources/db/migration/V4__create_organizations_and_memberships.sql
- backend/src/main/resources/db/migration/V5__create_organization_invitations.sql
- backend/src/main/resources/db/migration/V6__create_venues_and_sport_spaces.sql
- backend/src/main/resources/db/migration/V7__create_availability_rules_and_exceptions.sql
- backend/src/main/resources/db/migration/V8__create_venue_catalogs_and_amenities.sql
- backend/src/main/resources/db/migration/V9__add_public_venue_slug.sql
- backend/src/main/resources/db/migration/V10__create_reservations.sql
- backend/src/main/resources/db/migration/V11__normalize_currency_columns.sql
- backend/src/main/resources/db/migration/V12__align_jpa_column_types.sql
- backend/src/main/resources/db/migration/V13__create_sports_matches.sql
- backend/src/main/resources/db/migration/V14__normalize_match_currency.sql
- backend/src/main/resources/db/migration/V15__create_match_participants.sql
- backend/src/main/resources/db/migration/V16__create_capability_requests.sql
- backend/src/main/resources/db/migration/V17__create_payment_orders.sql
- backend/src/main/resources/db/migration/V18__normalize_payment_currency.sql
- backend/src/main/resources/db/migration/V19__allow_payment_pending_expiration.sql
- backend/src/main/resources/db/migration/V20__payment_installments_and_audit.sql
- backend/src/main/resources/db/migration/V21__create_match_join_orders.sql
- backend/src/main/resources/db/migration/V22__normalize_match_join_order_currency.sql
- backend/src/main/resources/db/migration/V23__add_player_identity_and_partner_businesses.sql
- backend/src/main/resources/db/migration/V24__create_reservation_check_in_passes.sql
- backend/src/main/resources/db/migration/V25__add_partner_business_contact_and_location.sql
- backend/src/main/resources/db/migration/V26__allow_address_based_partner_locations.sql
- backend/src/main/resources/db/migration/V27__add_partner_business_maps_url.sql
- backend/src/main/resources/db/migration/V28__create_match_invitations.sql
- backend/src/main/resources/db/migration/V29__create_match_check_in_passes.sql
- backend/src/main/resources/db/migration/V30__store_partner_business_images.sql

## Operacion y validacion

- Inicio: powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
- Parada: powershell -ExecutionPolicy Bypass -File scripts/stop-local.ps1
- Datos demo: powershell -ExecutionPolicy Bypass -File scripts/seed-demo-data.ps1
- Validacion: powershell -ExecutionPolicy Bypass -File scripts/validate-iteration-3.ps1
- Validacion: powershell -ExecutionPolicy Bypass -File scripts/validate-iteration-4.ps1
- Validacion: powershell -ExecutionPolicy Bypass -File scripts/validate-reservation-concurrency.ps1
- Frontend: npm run typecheck, npm run lint, npm run build.
- Backend: mvn test.

## Fuentes de verdad

1. Solicitud actual del responsable del producto.
2. docs/product/09_registro_decisiones.md.
3. docs/product/00_contexto_maestro_desarrollo_ia.md.
4. Requisitos del modulo y ADR aplicables.
5. Codigo y pruebas actuales.
