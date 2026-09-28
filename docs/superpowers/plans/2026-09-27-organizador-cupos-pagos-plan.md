# Organizador, cupos y pagos de pichanga Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contabilizar al organizador como jugador cuando elige participar, cobrarle su cuota con el flujo existente e incluirlo exactamente una vez en las métricas, mientras se mejora la señalización de partidos próximos y cuotas.

**Architecture:** Conservar `organizerCounts` como decisión explícita, activada por defecto en frontend. Reutilizar `match_join_orders` para la obligación financiera del organizador, sin crear un participante duplicado ni una tabla nueva, y exponerlo como fila financiera protegida en las consultas del organizador.

**Tech Stack:** Java 21, Spring Boot, JPA/JdbcTemplate, JUnit 5, Mockito, Next.js 16, React 19, TypeScript 5, Node test runner, Phosphor Icons.

**Spec:** `docs/superpowers/specs/2026-09-27-mejoras-partidos-reservas-mobile-design.md`

## Global Constraints

- La experiencia continúa siendo web responsive mobile-first.
- `Yo también juego` permanece configurable y comienza activado.
- El organizador participante ocupa y paga exactamente un cupo.
- El backend sigue siendo autoridad de cupos, importes y estados.
- Los pagos continúan simulados; no se agrega proveedor real.
- Toda orden mantiene idempotencia, propiedad por pagador y auditoría existente.
- No modificar migraciones Flyway aplicadas ni crear una tabla financiera paralela.
- El color nunca es el único indicador de proximidad, cuota o estado de pago.

## Review Focus

- Partido lleno: el organizador que ya ocupa cupo debe poder pagar sin que la validación de capacidad lo rechace.
- Reintento de pago: una orden pagada del organizador debe devolverse sin cobrar ni contar otro cupo.
- Organizador no participante: no debe poder crear una orden propia ni aparecer como deuda.
- Partido gratuito: el organizador participante debe aparecer como `NOT_REQUIRED`, sin orden de pago.
- Roster protegido: la fila sintética del organizador no debe ofrecer acciones de retiro o pago directo manual.

---

### Task 1: Contrato explícito y valor inicial de participación del organizador

**Files:**
- Modify: `frontend/features/matches/MatchBuilder.tsx`
- Create: `frontend/features/matches/draft.ts`
- Test: `frontend/tests/product-improvements.test.cjs`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: solicitud existente de creación con `organizerCounts: boolean`.
- Produces: borradores frontend nuevos con `organizerCounts=true` salvo decisión explícita del usuario.

- [ ] **Step 1: Escribir las pruebas fallidas de contrato y valor inicial**

Agregar `product-improvements.test.cjs` con una prueba que cargue una función exportada `defaultMatchDraft()` y afirme `organizerCounts === true`.

- [ ] **Step 2: Ejecutar las pruebas y comprobar RED**

Run: `cd frontend; npm test -- --test-name-pattern="organizer"`

Expected: FAIL porque `npm test` o `defaultMatchDraft()` todavía no existen.

- [ ] **Step 3: Implementar el contrato mínimo**

Crear `frontend/features/matches/draft.ts` con `export function defaultMatchDraft(): { organizerCounts: boolean }`. Usarlo en `MatchBuilder` y conservar el control para desactivarlo. El payload existente continúa enviando siempre el booleano explícito.

- [ ] **Step 4: Habilitar el runner de pruebas frontend**

Añadir a `frontend/package.json` el script `"test": "node --test tests/*.test.cjs"` y extender el cargador CommonJS del nuevo test para transpilar módulos TypeScript puros.

- [ ] **Step 5: Ejecutar GREEN**

Run: `cd frontend; npm test`

Expected: PASS, incluyendo el borrador con organizador activado.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/features/matches/draft.ts frontend/features/matches/MatchBuilder.tsx frontend/tests/product-improvements.test.cjs
git commit -m "feat: contar al organizador por defecto"
```

### Task 2: Orden de pago propia sin duplicar el cupo

**Files:**
- Modify: `backend/src/main/java/com/pulsopiura/platform/matches/application/MatchJoinPaymentService.java`
- Modify: `backend/src/test/java/com/pulsopiura/platform/matches/application/MatchJoinPaymentServiceTest.java`

**Interfaces:**
- Consumes: `MatchJoinPaymentService.start(UUID, String, MatchPaymentMethod, String)` y `simulate(UUID, UUID)`.
- Produces: `private boolean isPlayingOrganizer(SportsMatch match, UUID actor)`; las mismas respuestas `JoinOrderView` para jugadores y organizador.

- [ ] **Step 1: Escribir pruebas fallidas para los cinco casos críticos**

Agregar pruebas con nombres `playingOrganizerCanCreateOrderWhenMatchIsFull`, `playingOrganizerPaymentDoesNotCreateAnotherParticipation`, `nonPlayingOrganizerCannotCreateOwnOrder`, `paidOrganizerOrderIsIdempotent` y `anotherActorCannotSimulateOrganizerOrder`. Las aserciones deben verificar estado, ausencia de `confirmPaidJoin` para el organizador, rechazo explícito y propiedad de la orden.

- [ ] **Step 2: Ejecutar RED**

Run: `cd backend; mvn -Dtest=MatchJoinPaymentServiceTest test`

Expected: FAIL en los casos del organizador porque el servicio actual lo rechaza o intenta confirmar otra participación.

- [ ] **Step 3: Implementar la bifurcación mínima del organizador**

En `start`, permitir la orden solo cuando `isPlayingOrganizer` sea verdadero, omitir el conflicto por participación y omitir la validación `occupied + held` para esa obligación ya contabilizada. En `simulate`, marcar la orden pagada sin llamar `confirmPaidJoin` cuando el pagador sea el organizador participante. Mantener todas las validaciones actuales para otros jugadores.

- [ ] **Step 4: Ejecutar GREEN y regresión del módulo**

Run: `cd backend; mvn -Dtest=MatchJoinPaymentServiceTest,MatchServiceTest,MatchOrganizerManagementServiceTest test`

Expected: PASS sin dobles cupos ni relajación de propiedad.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/pulsopiura/platform/matches/application/MatchJoinPaymentService.java backend/src/test/java/com/pulsopiura/platform/matches/application/MatchJoinPaymentServiceTest.java
git commit -m "feat: cobrar cuota al organizador participante"
```

### Task 3: Fila financiera protegida del organizador

**Files:**
- Modify: `backend/src/main/java/com/pulsopiura/platform/matches/application/MatchOrganizerQueryService.java`
- Create: `backend/src/test/java/com/pulsopiura/platform/matches/application/MatchOrganizerQueryServiceTest.java`
- Modify: `frontend/features/matches/types.ts`

**Interfaces:**
- Consumes: `MatchOrganizerQueryService.participants(UUID actor, UUID matchId)`.
- Produces: `ParticipantView.source="ORGANIZER"` con `userId=organizerUserId`, estado `JOINED` y estado financiero derivado de la orden más reciente; `MatchParticipantAdmin.source` admite `"ORGANIZER"`.

- [ ] **Step 1: Escribir pruebas fallidas de roster financiero**

Probar que un organizador participante aparece una sola vez como `ORGANIZER`, queda `UNPAID` sin orden, `PENDING` con orden pendiente, `PAID` con importe y método confirmados, `NOT_REQUIRED` en un partido gratuito, y no aparece cuando `organizerCounts=false`.

- [ ] **Step 2: Ejecutar RED**

Run: `cd backend; mvn -Dtest=MatchOrganizerQueryServiceTest test`

Expected: FAIL porque la consulta solo devuelve participantes persistidos y manuales.

- [ ] **Step 3: Implementar la fila sintética**

Agregar una consulta acotada al organizador y su última orden. Anteponer el `ParticipantView` sintético solo cuando `organizerCounts=true`. Usar el identificador del usuario como clave estable y no crear registros en `match_participants`.

- [ ] **Step 4: Ejecutar GREEN**

Run: `cd backend; mvn -Dtest=MatchOrganizerQueryServiceTest,MatchJoinPaymentServiceTest test`

Expected: PASS.

- [ ] **Step 5: Actualizar el tipo frontend y ejecutar typecheck**

Ampliar `MatchParticipantAdmin.source` a `"ACCOUNT" | "MANUAL" | "ORGANIZER"` y documentar `participantId` como clave de vista, no como autorización.

Run: `cd frontend; npm run typecheck`

Expected: PASS; las comparaciones existentes aceptan el nuevo literal y la protección de acciones se completa en Task 4.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/pulsopiura/platform/matches/application/MatchOrganizerQueryService.java backend/src/test/java/com/pulsopiura/platform/matches/application/MatchOrganizerQueryServiceTest.java frontend/features/matches/types.ts
git commit -m "feat: incluir organizador en control financiero"
```

### Task 4: Pago propio y métricas consistentes en la interfaz

**Files:**
- Create: `frontend/features/matches/presentation.ts`
- Modify: `frontend/features/matches/MatchDetail.tsx`
- Modify: `frontend/features/matches/MatchOrganizerDashboard.tsx`
- Modify: `frontend/app/styles.css`
- Modify: `frontend/tests/product-improvements.test.cjs`

**Interfaces:**
- Consumes: `MatchParticipantAdmin[]`, `MatchSummary`, `MatchJoinOrder`.
- Produces: `summarizeMatchFinances(roster, priceMinor)` y `isProtectedOrganizerRow(participant)`; CTA `Pagar mi cuota` para el organizador participante.

- [ ] **Step 1: Escribir pruebas fallidas de resumen financiero**

Probar que `summarizeMatchFinances` cuenta una fila `ORGANIZER` pendiente, suma su pago confirmado, excluye `NOT_REQUIRED`, no duplica participantes y calcula `pendingMinor` usando `priceMinor`.

- [ ] **Step 2: Ejecutar RED**

Run: `cd frontend; npm test -- --test-name-pattern="financial|organizer row"`

Expected: FAIL porque `presentation.ts` todavía no existe.

- [ ] **Step 3: Implementar helpers puros**

Crear las firmas `export function summarizeMatchFinances(roster: MatchParticipantAdmin[], priceMinor: number): MatchFinanceSummary` y `export function isProtectedOrganizerRow(participant: MatchParticipantAdmin): boolean`.

- [ ] **Step 4: Integrar el flujo del organizador en `MatchDetail`**

Cuando `managedByCurrentUser && organizerCounts`, mostrar su estado de cuota. Reutilizar `payAndJoin`, pero después de pagar refrescar partido, orden y roster sin exigir una `MatchParticipation` persistida. Ocultar retiro y pago directo para la fila `ORGANIZER`.

- [ ] **Step 5: Integrar métricas y roster en ambos paneles**

Reemplazar cálculos duplicados por `summarizeMatchFinances`. Mostrar al organizador en confirmados, pagos, recaudado y por cobrar. Añadir texto `Tu cuota está pendiente` o `Tu cuota está pagada` según corresponda.

- [ ] **Step 6: Ejecutar GREEN, typecheck y lint**

Run: `cd frontend; npm test; npm run typecheck; npm run lint`

Expected: PASS, sin ramas no exhaustivas para `ORGANIZER`.

- [ ] **Step 7: Commit**

```bash
git add frontend/features/matches/presentation.ts frontend/features/matches/MatchDetail.tsx frontend/features/matches/MatchOrganizerDashboard.tsx frontend/features/matches/types.ts frontend/app/styles.css frontend/tests/product-improvements.test.cjs
git commit -m "feat: mostrar deuda y pago del organizador"
```

### Task 5: Partido más próximo y cuota destacada

**Files:**
- Create: `frontend/lib/match-discovery.ts`
- Modify: `frontend/features/home/HomeDashboard.tsx`
- Modify: `frontend/features/home/MatchDiscoveryPanel.tsx`
- Modify: `frontend/features/home/FeaturedMatchCard.tsx`
- Modify: `frontend/features/home/FeaturedMatchCard.module.css`
- Modify: `frontend/features/home/FeaturedMatchCardV2.tsx`
- Modify: `frontend/features/home/FeaturedMatchCardV2.module.css`
- Modify: `frontend/tests/product-improvements.test.cjs`

**Interfaces:**
- Consumes: objetos con `startsAt: string` y `priceMinor: number`.
- Produces: `sortUpcomingMatches<T extends { startsAt: string }>(matches: T[], now: number): T[]` y señal visual `Próximo por horario` para el primer partido futuro.

- [ ] **Step 1: Escribir pruebas fallidas de orden temporal**

Probar que la función no muta la entrada, excluye del indicador a partidos pasados, ordena futuros ascendentemente y selecciona exactamente un partido como próximo.

- [ ] **Step 2: Ejecutar RED**

Run: `cd frontend; npm test -- --test-name-pattern="upcoming matches"`

Expected: FAIL porque falta `match-discovery.ts`.

- [ ] **Step 3: Implementar el helper e integrarlo en Inicio**

Ordenar los datos reales antes de seleccionar el destacado. Añadir una etiqueta textual junto al horario del primer partido futuro.

- [ ] **Step 4: Resaltar la cuota de forma accesible**

Usar el tratamiento lima de conversión con etiqueta `Cuota por jugador`, importe y texto `/ persona`; conservar contraste, foco y lectura sin depender solo del color.

- [ ] **Step 5: Ejecutar GREEN y build**

Run: `cd frontend; npm test; npm run typecheck; npm run lint; npm run build`

Expected: PASS y build exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/match-discovery.ts frontend/features/home/HomeDashboard.tsx frontend/features/home/MatchDiscoveryPanel.tsx frontend/features/home/FeaturedMatchCard.tsx frontend/features/home/FeaturedMatchCard.module.css frontend/features/home/FeaturedMatchCardV2.tsx frontend/features/home/FeaturedMatchCardV2.module.css frontend/tests/product-improvements.test.cjs
git commit -m "feat: destacar partido proximo y cuota"
```

### Task 6: Documentación y verificación del bloque de partidos

**Files:**
- Modify: `docs/product/09_registro_decisiones.md`
- Modify: `docs/product/26_reglas_partidos.md`
- Modify: `docs/product/35_plan_evolucion_revision_cliente.md`

**Interfaces:**
- Consumes: comportamiento verificado en Tasks 1-5.
- Produces: decisión documentada de cupo y pago del organizador.

- [ ] **Step 1: Actualizar la documentación**

Registrar que `Yo también juego` inicia activo pero puede desactivarse antes de publicar; cuando está activo, el organizador ocupa un cupo y tiene una obligación financiera normal.

- [ ] **Step 2: Ejecutar la suite completa relevante**

Run: `cd backend; mvn test`

Expected: BUILD SUCCESS, 0 failures.

Run: `cd frontend; npm test; npm run typecheck; npm run lint; npm run build`

Expected: todos los comandos exit 0.

- [ ] **Step 3: Revisar diff y reglas de seguridad**

Run: `git diff --check; git status --short`

Expected: sin errores de whitespace; solo archivos previstos.

- [ ] **Step 4: Commit**

```bash
git add docs/product/09_registro_decisiones.md docs/product/26_reglas_partidos.md docs/product/35_plan_evolucion_revision_cliente.md
git commit -m "docs: registrar pago del organizador"
```
