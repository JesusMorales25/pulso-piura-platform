# 36. Checklist maestro del proyecto

**Fecha de corte:** 5 de septiembre de 2026  
**Estado global:** Iteraciones 1 y 2 operativas; sedes/catálogo implementados; reservas y validación E2E en curso.

## Leyenda

- `[x]` completado y documentado;
- `[~]` avanzado, pero requiere validación o decisión;
- `[ ]` pendiente;
- `[!]` no debe confundirse con funcionalidad productiva.

## 1. Estrategia y alcance

- [x] visión, problema, actores y alcance del MVP;
- [x] diferenciación: completar partidos, reservas y mini campeonatos;
- [x] producto SaaS multicomplejo, no software a medida;
- [~] nombre de trabajo `Pulso Piura`;
- [ ] búsqueda registral, dominio y elección comercial de marca;
- [ ] validar modelo comercial SaaS, comisión o híbrido.

## 2. Investigación y validación

- [x] plan de validación de 30 días;
- [x] cuestionario y Apps Script inicial para Google Forms;
- [~] encuesta preparada; publicación diferida hasta contar con un incremento funcional y acceso a participantes;
- [~] obtener respuestas de jugadores, capitanes y complejos (validación diferida, sin datos inventados);
- [~] entrevistar complejos y analizar resultados (retomar antes del piloto público o pagos reales);
- [ ] confirmar 1–3 complejos para el piloto.

## 3. Producto y requisitos

- [x] requisitos, épicas e historias iniciales;
- [x] reglas de reservas, partidos, cupos y lista de espera;
- [x] paneles conceptuales, eventos, notificaciones y auditoría;
- [x] análisis y depuración de `Requerimientos.docx` contra alcance, arquitectura y backlog;
- [x] incorporación planificada de amenidades, recurrencia, QR, quórum, reportes, CRM, calendario y comercios aliados;
- [~] políticas de cancelación y devolución;
- [ ] priorizar y congelar el backlog MVP después de validar.

## 4. Arquitectura y seguridad

- [x] Next.js, React y TypeScript como frontend objetivo;
- [x] web responsive mobile-first y PWA opcional;
- [x] Java Spring Boot modular, PostgreSQL y Flyway;
- [x] Keycloak/OIDC, Google federado y Spring Security;
- [x] RBAC, permisos contextuales y aislamiento multitenant;
- [x] modelo de amenazas, API y modelo físico inicial;
- [ ] ADR final de infraestructura y operación de Keycloak;
- [~] repositorio productivo, CI y ambiente local base creados; despliegue remoto pendiente.
- [x] principios SOLID y formateo automático incorporados a reglas y CI;
- [x] credenciales, aprovisionamiento y servicios locales verificados con Docker Desktop.

## 5. Pagos

- [x] arquitectura desacoplada para Yape, Plin y QR interoperable;
- [x] webhook, idempotencia, conciliación y contingencia manual;
- [ ] cotizar y evaluar Culqi, Niubiz e Izipay;
- [ ] seleccionar proveedor y abrir sandbox comercial;
- [ ] implementar y probar pagos reales;
- [!] el prototipo no procesa dinero.

## 6. Diseño y prototipo

- [x] tres direcciones visuales exploradas;
- [x] dirección, paleta, tokens y componentes seleccionados;
- [x] wireframes del flujo principal;
- [x] prototipo web responsive mobile-first;
- [x] adaptación para celular, tablet y escritorio;
- [x] rediseño conectado al catálogo real, con navegación Inicio/Explorar/Gestión/Actividad/Perfil;
- [x] separación explícita entre catálogo público y espacio administrativo;
- [x] recursos fotográficos propios e iconografía consistente integrados;
- [~] marca y wordmark provisionales;
- [~] estados de carga, vacío y error implementados; faltan conflicto y vencimiento de reserva;
- [ ] validación visual en navegador a 360 px y escritorio;
- [ ] pruebas con jugadores y complejos;
- [!] Yape, Plin y confirmación de reserva todavía no están operativos.

## 7. Desarrollo productivo

- [x] crear repositorio y arquitectura base en `outputs/pulso-piura-platform`;
- [x] inicializar Next.js y Spring Boot;
- [x] PostgreSQL, Keycloak y Docker Compose ejecutados integralmente en local;
- [x] identidad, login OIDC local, aprovisionamiento y perfil mínimo operativos;
- [x] organizaciones, membresías, invitaciones y autorización contextual implementadas y verificadas con matriz de 12 pruebas;
- [~] sedes, canchas, disponibilidad, catálogos, amenidades y catálogo público implementados; falta validación visual/E2E;
- [~] reservas simples: bloques 4A/4B implementados con `V10`, dominio, creación idempotente, expiración e historial; falta prueba PostgreSQL y continuar 4C;
- [ ] partidos, cupos y lista de espera;
- [ ] pagos reales y panel de complejos;
- [ ] torneos según priorización;
- [ ] pruebas unitarias, integración, seguridad y E2E;
- [ ] observabilidad, respaldos y despliegue piloto.

## Punto exacto actual

Las **Iteraciones 1 y 2** funcionan en local con identidad, organizaciones y autorización contextual. La **Iteración 3** tiene backend administrativo, migraciones, disponibilidad, auditoría y OpenAPI en desarrollo. La revisión del Word externo fue incorporada mediante requisitos depurados; no se asumieron como válidas sus tarifas ni decisiones comerciales.

## Próxima secuencia recomendada

1. validar visualmente Inicio, Explorar, Gestión y Perfil a 360 px y escritorio;
2. cerrar pruebas de integración y aislamiento pendientes de sedes/catálogo;
3. implementar 4C/4D: consulta, confirmación, cancelación, slots reservables e interfaz de hold;
4. implementar partidos/cupos únicamente después de cerrar reservas;
5. retomar cuestionarios y pruebas con jugadores y complejos;
6. consolidar hallazgos antes de pagos reales y piloto público;
7. seleccionar proveedor de pagos y continuar según el backlog.
