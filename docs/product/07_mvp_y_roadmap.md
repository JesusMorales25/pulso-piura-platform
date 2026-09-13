# 7. MVP y roadmap

## Objetivo del MVP

Demostrar que la plataforma puede aumentar la probabilidad de que un partido se complete y reducir el trabajo del capitán, sin construir todavía todo el ecosistema deportivo.

## Alcance MVP

### Núcleo jugador/capitán

- acceso por celular;
- perfil básico;
- crear y compartir partido;
- unirse/salir;
- cupos y lista de espera;
- confirmaciones;
- registro de pago;
- asistencia y cancelaciones;
- notificaciones esenciales.

### Núcleo complejo

- organización, sede y cancha;
- calendario básico;
- bloqueo/reserva;
- reglas de precio y adelanto;
- operador y administrador;
- reporte mínimo de ocupación.

### Núcleo torneo, si la validación lo prioriza

- torneo y equipos;
- inscripción;
- fixture manual/asistido;
- resultados y tabla pública.

## Fases

| Fase | Resultado |
|---|---|
| 0. Documentación | visión, requisitos, arquitectura, seguridad y criterios |
| 1. Validación | encuestas, entrevistas y procesos observados |
| 2. Piloto manual | partidos reales gestionados sin plataforma completa |
| 3. Prototipo | pruebas de flujo y comprensión |
| 4. MVP técnico | producto web funcional con seguridad básica |
| 5. Beta cerrada | operación con complejos y grupos seleccionados |
| 6. Lanzamiento local | adquisición, soporte y monetización |

## Criterios de salida del MVP

- no existen dobles reservas en las pruebas críticas;
- roles y aislamiento multicomplejo están verificados;
- el flujo de unirse a partido funciona desde móvil;
- lista de espera y cancelación conservan consistencia;
- eventos sensibles quedan auditados;
- backups y restauración fueron probados;
- métricas de producto están disponibles;
- existe soporte para resolver incidencias del piloto.

## No comprometer todavía

- fecha pública de lanzamiento;
- precio definitivo;
- integración específica con una billetera;
- aplicación nativa;
- estadísticas deportivas avanzadas;
- expansión fuera de Piura;
- funciones exclusivas solicitadas por un solo complejo.

## Extensiones ordenadas después del núcleo

| Extensión | Entrada | Resultado esperado |
|---|---|---|
| 4B Reservas avanzadas | Reserva simple y anti-solapamiento verificados | Series recurrentes, historial y pase QR |
| 5B Automatización de partidos | Cupos y pagos operativos consistentes | Quórum y cancelación/confirmación idempotente |
| 6B Operación comercial | Pagos y conciliación estables | Reportes, exportaciones y promociones simples |
| 7B Torneos avanzados | Torneo básico validado | Goleadores, tarjetas y estadísticas |
| 8 Fidelización e integraciones | Beta con consentimiento y recurrencia medible | CRM derivado, eventos e integración de calendario |
| 9 Comercios aliados | Validación comercial y política de contenido | Campañas, enlaces seguros, clics agregados y cobro separado |

Estas extensiones no modifican el criterio de salida del MVP ni desplazan el flujo principal de
reservas, partidos y cupos.
