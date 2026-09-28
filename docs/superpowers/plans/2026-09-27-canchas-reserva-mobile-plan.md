# Canchas, disponibilidad y reserva móvil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incorporar calificación administrada, filtros reales por zona y atributos, adelanto del 20 % y una reserva móvil fiel a la referencia que muestre públicamente solo turnos disponibles.

**Architecture:** Extender `venues` con dos campos configurables y exponerlos en sus DTO actuales. Mantener `BookableAvailabilityService` como frontera pública de disponibilidad, calcular el adelanto al crear la reserva y dividir la interfaz monolítica de catálogo en helpers y componentes enfocados para tarjeta y selector de horarios.

**Tech Stack:** PostgreSQL, Flyway, Java 21, Spring Boot, JPA, JUnit 5, Next.js 16, React 19, TypeScript 5, CSS Modules/estilos existentes, Node test runner, navegador integrado de Codex, Poppler/ReportLab para el informe final.

**Spec:** `docs/superpowers/specs/2026-09-27-mejoras-partidos-reservas-mobile-design.md`

## Global Constraints

- Mostrar públicamente solo turnos futuros y reservables.
- Los turnos reservados siguen visibles únicamente para su propietario y personal autorizado del complejo.
- El adelanto de reservas nuevas es el techo de 20 %; reservas existentes conservan `depositMinor`.
- La calificación administrada admite 0.0-5.0 y no se presenta como reseña verificada.
- No modificar migraciones aplicadas; crear `V32__add_admin_venue_rating.sql`.
- Usar datos reales de `districtCode`, `indoor` y amenidades; no codificar listas paralelas.
- Mantener controles táctiles mínimos de 44 por 44 px y evitar desbordamiento en 320, 393 y 768 px.
- Reutilizar imágenes, iconos y tokens existentes; no añadir placeholders ni un sistema visual paralelo.
- Toda autorización de administración y tenant permanece en backend.

## Review Focus

- Totales no divisibles por cinco: el adelanto debe redondearse hacia arriba en unidad mínima.
- Reserva existente con adelanto del 25 %: el pago debe respetar `depositMinor`, no recalcular 20 %.
- Calificación parcialmente informada: rating y cantidad deben ser ambos nulos o ambos válidos.
- Amenidad presente a nivel de complejo: el filtro LED/estacionamiento debe considerar la unión con amenidades de la cancha cuando corresponda.
- Cambio de disponibilidad entre selección y hold: la UI debe informar conflicto, limpiar la selección obsoleta y refrescar turnos sin revelar quién reservó.

---

### Task 1: Persistencia y validación de calificación administrada

**Files:**
- Create: `backend/src/main/resources/db/migration/V32__add_admin_venue_rating.sql`
- Modify: `backend/src/main/java/com/pulsopiura/platform/venues/infrastructure/persistence/VenueEntity.java`
- Create: `backend/src/test/java/com/pulsopiura/platform/venues/infrastructure/persistence/VenueEntityTest.java`

**Interfaces:**
- Produces: `BigDecimal adminRating()` y `Integer adminRatingCount()`; `VenueEntity.create` y `update` reciben ambos valores opcionales.
- Consumes: validación existente de versión y estado configurable.

- [ ] **Step 1: Escribir pruebas fallidas de dominio**

Agregar pruebas `acceptsValidAdminRating`, `rejectsRatingBelowZero`, `rejectsRatingAboveFive`, `rejectsNegativeRatingCount`, `rejectsPartiallyConfiguredRating` y `updatesRatingWithOptimisticVersion`.

- [ ] **Step 2: Ejecutar RED**

Run: `cd backend; mvn -Dtest=VenueEntityTest test`

Expected: FAIL porque los campos y firmas no existen.

- [ ] **Step 3: Crear la migración V32**

Añadir `admin_rating numeric(2,1)` y `admin_rating_count integer`, ambos anulables, con checks de rango y un check conjunto que exija ambos nulos o ambos informados.

- [ ] **Step 4: Implementar validación en `VenueEntity`**

Agregar `validateAdminRating(BigDecimal rating, Integer count)` y aplicar la misma regla en creación y actualización. Mantener temporalmente las firmas actuales como overloads que delegan con ambos valores nulos, para que este commit compile antes de propagar el contrato en Task 2. No usar `double`.

- [ ] **Step 5: Ejecutar GREEN**

Run: `cd backend; mvn -Dtest=VenueEntityTest test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V32__add_admin_venue_rating.sql backend/src/main/java/com/pulsopiura/platform/venues/infrastructure/persistence/VenueEntity.java backend/src/test/java/com/pulsopiura/platform/venues/infrastructure/persistence/VenueEntityTest.java
git commit -m "feat: guardar calificacion administrada de complejos"
```

### Task 2: Contratos administrativo y público de calificación

**Files:**
- Modify: `backend/src/main/java/com/pulsopiura/platform/venues/api/VenueController.java`
- Modify: `backend/src/main/java/com/pulsopiura/platform/venues/application/VenueService.java`
- Modify: `backend/src/main/java/com/pulsopiura/platform/venues/application/VenueView.java`
- Modify: `backend/src/main/java/com/pulsopiura/platform/venues/application/PublicVenueViews.java`
- Modify: `backend/src/main/java/com/pulsopiura/platform/venues/application/PublicVenueQueryService.java`
- Create: `backend/src/test/java/com/pulsopiura/platform/venues/application/VenueServiceTest.java`
- Modify: `backend/src/test/java/com/pulsopiura/platform/venues/application/PublicVenueQueryServiceTest.java`

**Interfaces:**
- Consumes: `VenueEntity.adminRating()` y `adminRatingCount()`.
- Produces: `VenueView.adminRating`, `VenueView.adminRatingCount`, `PublicVenueViews.Venue.adminRating`, `PublicVenueViews.Venue.adminRatingCount`; requests administrativos con `@DecimalMin("0.0")`, `@DecimalMax("5.0")` y `@PositiveOrZero`.

- [ ] **Step 1: Escribir pruebas fallidas de servicio y proyección pública**

Probar que OWNER de la organización actualiza ambos campos, otro tenant recibe acceso denegado, la vista pública expone valores configurados y conserva nulos cuando no existen.

- [ ] **Step 2: Ejecutar RED**

Run: `cd backend; mvn -Dtest=VenueServiceTest,PublicVenueQueryServiceTest test`

Expected: FAIL por contratos incompletos.

- [ ] **Step 3: Propagar los campos por servicios y DTOs**

Extender creación, actualización, mapeos administrativos y mapeos públicos sin duplicar validación de negocio ni debilitar `VenueService` authorization.

- [ ] **Step 4: Ejecutar GREEN y tests de autorización relacionados**

Run: `cd backend; mvn -Dtest=VenueServiceTest,PublicVenueQueryServiceTest,VenueCatalogServiceTest test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/pulsopiura/platform/venues backend/src/test/java/com/pulsopiura/platform/venues
git commit -m "feat: exponer calificacion configurable de complejos"
```

### Task 3: Adelanto del 20 % como importe persistido

**Files:**
- Modify: `backend/src/main/java/com/pulsopiura/platform/reservations/application/CreateReservationService.java`
- Modify: `backend/src/main/java/com/pulsopiura/platform/payments/application/PaymentOrderService.java`
- Modify: `backend/src/test/java/com/pulsopiura/platform/reservations/application/CreateReservationServiceTest.java`
- Modify: `backend/src/test/java/com/pulsopiura/platform/payments/application/PaymentOrderServiceTest.java`
- Create: `frontend/features/reservations/payment-options.ts`
- Modify: `frontend/features/reservations/ReservationCheckout.tsx`
- Modify: `frontend/tests/product-improvements.test.cjs`

**Interfaces:**
- Produces: `private long depositMinor(long totalMinor)` o helper de dominio equivalente que calcula `(totalMinor + 4) / 5`; `ReservationCheckout` acepta `initialPlan?: "DEPOSIT" | "FULL"`.
- Consumes: `ReservationView.depositMinor`; `PaymentPlan.DEPOSIT` usa ese valor sin recalcular porcentaje.

- [ ] **Step 1: Escribir pruebas fallidas del 20 % y compatibilidad histórica**

En `CreateReservationServiceTest`, afirmar 1,801 para total 9,001 y 1,800 para total 9,000. En `PaymentOrderServiceTest`, crear una reserva existente con `depositMinor=2,250` y afirmar que la orden cobra 2,250 aunque equivalga al 25 % histórico.

- [ ] **Step 2: Ejecutar RED**

Run: `cd backend; mvn -Dtest=CreateReservationServiceTest,PaymentOrderServiceTest test`

Expected: FAIL porque creación y orden recalculan 25 %.

- [ ] **Step 3: Implementar el cálculo y consumo persistido**

Calcular el techo de 20 % únicamente al crear la reserva. En `PaymentOrderService`, usar `reservation.depositMinor()` para `DEPOSIT` y validar que sea positivo y no exceda el total.

- [ ] **Step 4: Ejecutar GREEN y concurrencia de pagos**

Run: `cd backend; mvn -Dtest=CreateReservationServiceTest,PaymentOrderServiceTest,ReservationPaymentConcurrencyTest test`

Expected: PASS.

- [ ] **Step 5: Actualizar presentación frontend con prueba fallida primero**

Añadir un helper exportado `reservationPaymentOptions(reservation)` que devuelva importes `DEPOSIT` y `FULL`; probar que usa `depositMinor`. Reemplazar `Math.ceil(totalMinor / 4)` y el texto `Adelanto 25%` por el valor persistido y `Adelanto 20 %`. Añadir `initialPlan?: "DEPOSIT" | "FULL"` para que la tarjeta móvil pueda elegir el plan antes de crear el hold.

- [ ] **Step 6: Ejecutar GREEN frontend**

Run: `cd frontend; npm test; npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/pulsopiura/platform/reservations/application/CreateReservationService.java backend/src/main/java/com/pulsopiura/platform/payments/application/PaymentOrderService.java backend/src/test/java/com/pulsopiura/platform/reservations/application/CreateReservationServiceTest.java backend/src/test/java/com/pulsopiura/platform/payments/application/PaymentOrderServiceTest.java frontend/features/reservations/ReservationCheckout.tsx frontend/tests/product-improvements.test.cjs
git commit -m "feat: usar adelanto persistido del veinte por ciento"
```

### Task 4: Modelo de filtros de zona y atributos

**Files:**
- Create: `frontend/lib/venue-discovery.ts`
- Modify: `frontend/features/venues/PublicVenueCatalog.tsx`
- Modify: `frontend/tests/product-improvements.test.cjs`

**Interfaces:**
- Produces: `districtOptions(venues: VenueSummary[]): string[]`, `matchesVenueFilters(offer: VenueOfferSummary, filters: VenueFilters): boolean` y tipos `VenueFilters { district: string; covered: boolean; led: boolean }`.
- Consumes: `districtCode`, `Space.indoor`, `venue.amenityCodes`, `space.amenityCodes`, código `LED_LIGHTING` y nombres del catálogo.

- [ ] **Step 1: Escribir pruebas fallidas de filtros**

Probar zonas únicas ordenadas, opción vacía `Todas las zonas`, coincidencia exacta normalizada de distrito, cubierta por `indoor`, LED en amenidades de cancha y unión segura de amenidades.

- [ ] **Step 2: Ejecutar RED**

Run: `cd frontend; npm test -- --test-name-pattern="venue filters"`

Expected: FAIL porque falta `venue-discovery.ts`.

- [ ] **Step 3: Implementar helpers puros**

Normalizar con `toLocaleLowerCase("es-PE")`; no incluir texto visual ni acceder al DOM dentro de los helpers.

- [ ] **Step 4: Integrar controles en `PublicVenueCatalog`**

Agregar selector de zona derivado de sedes publicadas y toggles accesibles `Techada o cubierta` e `Iluminación LED`. Aplicar filtros a ofertas y espacios sin solicitar ni mostrar turnos ocupados.

- [ ] **Step 5: Implementar estado vacío y limpiar filtros**

Cuando la combinación no tenga resultados, mostrar explicación y botón `Limpiar filtros` que restablezca solo filtros de zona/atributos, conservando fecha y deporte.

- [ ] **Step 6: Ejecutar GREEN, typecheck y lint**

Run: `cd frontend; npm test; npm run typecheck; npm run lint`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/venue-discovery.ts frontend/features/venues/PublicVenueCatalog.tsx frontend/tests/product-improvements.test.cjs
git commit -m "feat: filtrar canchas por zona techo y luces"
```

### Task 5: Administración frontend de la calificación

**Files:**
- Create: `frontend/lib/venue-rating.ts`
- Modify: `frontend/features/venues/VenueAdmin.tsx`
- Modify: `frontend/app/styles.css`
- Modify: `frontend/tests/product-improvements.test.cjs`

**Interfaces:**
- Consumes: `VenueView.adminRating: number | null`, `adminRatingCount: number | null`.
- Produces: formulario administrativo con ambos campos opcionales y payload nulo o válido en conjunto.

- [ ] **Step 1: Escribir prueba fallida de normalización**

Crear `normalizeAdminRatingInput(rating: string, count: string)` en `frontend/lib/venue-rating.ts` y probar valores vacíos, 4.9/142, límites 0.0/5.0, combinación parcial y cantidad negativa.

- [ ] **Step 2: Ejecutar RED**

Run: `cd frontend; npm test -- --test-name-pattern="admin rating"`

Expected: FAIL porque el helper no existe.

- [ ] **Step 3: Implementar helper y formulario**

Añadir entradas numéricas con pasos `0.1` y `1`, texto `Calificación informada por el complejo` y errores antes de enviar. Propagar los campos en creación y edición.

- [ ] **Step 4: Ejecutar GREEN, typecheck y lint**

Run: `cd frontend; npm test; npm run typecheck; npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/venue-rating.ts frontend/features/venues/VenueAdmin.tsx frontend/app/styles.css frontend/tests/product-improvements.test.cjs
git commit -m "feat: configurar calificacion del complejo"
```

### Task 6: Tarjeta móvil fiel a la referencia

**Files:**
- Create: `frontend/features/venues/VenueBookingCard.tsx`
- Create: `frontend/features/venues/VenueBookingCard.module.css`
- Modify: `frontend/features/venues/PublicVenueCatalog.tsx`
- Modify: `frontend/app/styles.css`

**Interfaces:**
- Consumes: `VenueOffer`, hasta cinco `Slot` disponibles, nombres de amenidades y callbacks `onSelectSlot`, `onReserve(plan: "DEPOSIT" | "FULL")`, `onOpenSchedules`.
- Produces: tarjeta compacta con cabecera, rating administrado, chips, precio, turnos, selección y resumen de acciones.

- [ ] **Step 1: Definir el contrato del componente mediante prueba estructural**

Extender `product-improvements.test.cjs` para comprobar que `VenueBookingCard` recibe slots ya filtrados, usa botones para horarios, expone `aria-pressed` y no renderiza estados `reserved` u `occupied`.

- [ ] **Step 2: Ejecutar RED**

Run: `cd frontend; npm test -- --test-name-pattern="booking card"`

Expected: FAIL porque el componente no existe.

- [ ] **Step 3: Implementar la composición visual**

Usar las imágenes de canchas existentes, `@phosphor-icons/react`, tokens del proyecto y la jerarquía de la referencia. Mostrar `Sin calificación` cuando sea nula y el título accesible `Calificación informada por el complejo` cuando exista.

- [ ] **Step 4: Implementar interacción móvil**

El horario seleccionado usa clase `selected`, `aria-pressed=true`, texto `Elegido` y resumen inferior. Las acciones son `Reservar con 20 %`, `Pagar completo` y `Otros horarios`; ambas acciones de pago propagan el plan elegido al checkout mediante `initialPlan`. No anidar botones ni enlaces.

- [ ] **Step 5: Integrar en `PublicVenueCatalog`**

Reemplazar la tarjeta duplicada actual por `VenueBookingCard`, manteniendo carga, error, navegación, selección consecutiva y creación de hold existentes.

- [ ] **Step 6: Ejecutar pruebas y build**

Run: `cd frontend; npm test; npm run typecheck; npm run lint; npm run build`

Expected: PASS y build exit 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/features/venues/VenueBookingCard.tsx frontend/features/venues/VenueBookingCard.module.css frontend/features/venues/PublicVenueCatalog.tsx frontend/app/styles.css frontend/tests/product-improvements.test.cjs
git commit -m "feat: adaptar tarjeta movil de reservas"
```

### Task 7: Detalle de cancha, horarios y conflicto de disponibilidad

**Files:**
- Create: `frontend/features/venues/VenueScheduleDialog.tsx`
- Create: `frontend/features/venues/VenueScheduleDialog.module.css`
- Modify: `frontend/features/venues/PublicVenueCatalog.tsx`
- Modify: `frontend/tests/product-improvements.test.cjs`
- Modify: `backend/src/test/java/com/pulsopiura/platform/reservations/application/BookableAvailabilityServiceTest.java`

**Interfaces:**
- Consumes: `Venue`, `Space[]`, `Availability.slots`, `selectedSlots` y callbacks de apertura/cierre/reserva.
- Produces: diálogo con detalle completo y solo horarios disponibles; ante 409, callback `onAvailabilityConflict()` limpia selección y recarga.

- [ ] **Step 1: Reforzar prueba backend de privacidad de turnos**

Agregar casos para reserva confirmada, hold vigente y hold vencido. Afirmar que confirmada y vigente se omiten y la vencida vuelve a estar disponible, sin DTO de propietario.

- [ ] **Step 2: Ejecutar RED o verificar cobertura existente**

Run: `cd backend; mvn -Dtest=BookableAvailabilityServiceTest test`

Expected: cualquier caso nuevo no soportado falla; si el comportamiento ya existe, confirmar que la nueva prueba pasa y conservarla como regresión.

- [ ] **Step 3: Escribir prueba frontend fallida de conflicto**

Probar el helper `reconcileSelectedSlots(selected, freshAvailability)` y afirmar que elimina slots que dejaron de estar disponibles sin introducir estados ocupados.

- [ ] **Step 4: Implementar diálogo y reconciliación**

Extraer el modal actual a `VenueScheduleDialog`. Mostrar nombre, dirección, zona, rating administrado, precio, tipo, techo, LED, estacionamiento y amenidades; omitir valores ausentes o usar `No informado` solo en campos esenciales.

- [ ] **Step 5: Manejar 409 de creación de hold**

Al conflicto, limpiar selección obsoleta, recargar `/bookable-slots`, mantener abierto el diálogo y mostrar `El horario acaba de reservarse. Elige otro disponible.`

- [ ] **Step 6: Ejecutar GREEN y regresión**

Run: `cd backend; mvn -Dtest=BookableAvailabilityServiceTest,CreateReservationServiceTest test`

Expected: PASS.

Run: `cd frontend; npm test; npm run typecheck; npm run lint; npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/features/venues/VenueScheduleDialog.tsx frontend/features/venues/VenueScheduleDialog.module.css frontend/features/venues/PublicVenueCatalog.tsx frontend/tests/product-improvements.test.cjs backend/src/test/java/com/pulsopiura/platform/reservations/application/BookableAvailabilityServiceTest.java
git commit -m "feat: organizar detalle y horarios disponibles"
```

### Task 8: QA visual y accesibilidad móvil

**Files:**
- Modify: `design-qa.md`
- Create: `.verification/reference-reservation-card.png`
- Create: `.verification/reservation-mobile-320.png`
- Create: `.verification/reservation-mobile-393.png`
- Create: `.verification/reservation-tablet-768.png`

**Interfaces:**
- Consumes: imagen de referencia `C:/Users/JESUSM~1.S/AppData/Local/Temp/codex-clipboard-42862b2e-a75f-4cfc-a192-69fae76eaf25.png` y aplicación local.
- Produces: `design-qa.md` con `final result: passed` y capturas comparables.

- [ ] **Step 1: Iniciar entorno local verificable**

Copiar la imagen exacta proporcionada por el usuario a `.verification/reference-reservation-card.png`, ejecutar el flujo local soportado por el repositorio, abrir la aplicación con el navegador integrado de Codex y conservar el servidor activo.

- [ ] **Step 2: Capturar el mismo estado de la referencia**

Configurar una cancha con calificación, LED, techo, estacionamiento y cinco horarios; capturar la tarjeta con un horario seleccionado en 393 px.

- [ ] **Step 3: Ejecutar design QA bloqueante**

Usar `product-design:design-qa` para comparar referencia e implementación en el mismo viewport. Registrar P0-P3 en `design-qa.md`.

- [ ] **Step 4: Corregir P0, P1 y P2 y repetir**

Repetir captura y comparación hasta que `design-qa.md` contenga `final result: passed`. No bloquear la entrega por P3 cosmético documentado.

- [ ] **Step 5: Validar 320, 393 y 768 px**

Comprobar ausencia de scroll horizontal, blancos táctiles, foco visible, selección, `Otros horarios`, ambas acciones de pago, cierre del diálogo y consola sin errores.

- [ ] **Step 6: Commit**

```bash
git add design-qa.md .verification/reference-reservation-card.png .verification/reservation-mobile-320.png .verification/reservation-mobile-393.png .verification/reservation-tablet-768.png
git commit -m "test: validar experiencia movil de reservas"
```

### Task 9: Documentación, índice e informe PDF final

**Files:**
- Modify: `docs/product/09_registro_decisiones.md`
- Modify: `docs/product/25_reglas_reservas.md`
- Modify: `docs/product/32_pagos_yape_plin.md`
- Modify: `docs/product/34_identidad_visual_sistema_diseno.md`
- Modify: `docs/product/35_plan_evolucion_revision_cliente.md`
- Modify: `docs/CODEBASE_INDEX.md`
- Create: `output/pdf/mejoras-pulso-piura-implementadas.pdf`

**Interfaces:**
- Consumes: commits y evidencia de Tasks 1-8 de ambos planes.
- Produces: documentación actualizada e informe verificable para el responsable del producto.

- [ ] **Step 1: Actualizar reglas y decisiones**

Documentar rating administrado, adelanto del 20 %, visibilidad pública exclusiva de disponibilidad y organización móvil de la reserva.

- [ ] **Step 2: Regenerar el índice del código**

Run: `powershell -ExecutionPolicy Bypass -File scripts/update-codebase-index.ps1`

Expected: índice actualizado incluyendo `V32` y nuevos componentes/helpers.

- [ ] **Step 3: Ejecutar verificación completa fresca**

Run: `cd backend; mvn test`

Expected: BUILD SUCCESS, 0 failures.

Run: `cd frontend; npm test; npm run typecheck; npm run lint; npm run build`

Expected: todos los comandos exit 0.

Run: `git diff --check`

Expected: exit 0.

- [ ] **Step 4: Crear el informe PDF mediante la habilidad `pdf`**

Antes del primer comando de autoría, ejecutar exactamente una vez el marcador exigido por la habilidad PDF con `--operation-kind create --expected-output-count 1 --output-format pdf`. El informe debe mapear los doce requerimientos, decisiones 3/4 corregidas, archivos modificados, pruebas y capturas 320/393/768.

- [ ] **Step 5: Renderizar y revisar todas las páginas**

Renderizar con Poppler a `tmp/pdfs/`, inspeccionar legibilidad, tablas, saltos, imágenes, encabezados y numeración. Repetir hasta cero defectos visuales.

- [ ] **Step 6: Commit de documentación**

```bash
git add docs/product docs/CODEBASE_INDEX.md
git commit -m "docs: documentar mejoras de reservas y canchas"
```

- [ ] **Step 7: Verificación final del árbol**

Run: `git status --short; git log --oneline -12`

Expected: sin cambios de código o documentación pendientes; el PDF final existe bajo `output/pdf/` aunque permanezca fuera de Git si esa ruta está ignorada.
