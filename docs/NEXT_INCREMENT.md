# Siguiente incremento recomendado

La revisión vigente de arquitectura, seguridad y estrategia de entrega se encuentra en
[ARQUITECTURA_SEGURIDAD_REVIEW.md](ARQUITECTURA_SEGURIDAD_REVIEW.md). Se mantiene el stack actual y
se adopta entrega por cortes verticales. Antes de ampliar partidos o pagos deben cerrarse reservas
4C/4D y los controles de estabilización prioritarios indicados en esa revisión.

## Iteración 1 cerrada localmente

El entorno Docker, el login OIDC local, el perfil y el aprovisionamiento están operativos. Google real sigue condicionado a credenciales OAuth por ambiente. Las pruebas avanzadas de token vencido, aprovisionamiento concurrente y cuenta suspendida permanecen como hardening.

## Iteración 2 cerrada: organizaciones y RBAC

1. Crear organizaciones y membresías multicomplejo. **Completado.**
2. Definir roles y permisos iniciales en PostgreSQL. **Completado.**
3. Implementar autorización contextual en servicios Spring Boot. **Completado.**
4. Proteger `/admin/{orgId}` contra acceso cruzado entre tenants. **Completado.**
5. Agregar invitación, activación y revocación auditadas. **Completado.**
6. Verificar matriz OWNER/ADMIN/OPERATOR y otro tenant. **12 pruebas aprobadas.**

## Iteración visual web mobile-first — 5 de septiembre de 2026

La experiencia se reorganizó en `Inicio`, `Explorar`, `Gestión`, `Actividad` y `Perfil`. `Explorar`
es el catálogo público disponible para jugadores; `Gestión` contiene las organizaciones y paneles
administrativos del usuario. El inicio consume complejos reales y las capacidades todavía no
implementadas se identifican expresamente como `Próximamente`.

El alcance, criterios y orden funcional están documentados en
[FRONTEND_ROADMAP.md](FRONTEND_ROADMAP.md). La próxima entrega de producto continúa siendo el
cierre de reservas simples; no se adelantará la interfaz funcional de partidos ni pagos.

## Iteración de sedes, canchas y disponibilidad

Plan aprobado para implementación en [ITERATION_3_VENUES_PLAN.md](ITERATION_3_VENUES_PLAN.md).

Primer bloque:

1. migración de sedes y espacios con constraints de tenant;
2. casos de uso administrativos autorizados;
3. panel mobile-first de sedes y canchas;
4. reglas y excepciones de disponibilidad;
5. catálogo público sin datos privados.

No comenzar reservas hasta validar el cálculo de slots teóricos y el aislamiento de recursos entre organizaciones.

Los primeros siete bloques ya incorporan migraciones, zona horaria, sedes, espacios deportivos,
edición versionada, ciclos de publicación/archivo, reglas semanales, precios y excepciones.
El contrato OpenAPI y la auditoría administrativa ya están incorporados. La revisión de
`Requerimientos.docx` añadió modalidades, superficies y amenidades reutilizables a la Iteración 3,
y el backend ya las implementa mediante la migración `V8`, asociaciones aisladas por tenant y un
endpoint de catálogo público. El panel administrativo mobile-first ya permite navegar, crear,
editar, publicar y archivar sedes/canchas con esos catálogos y control de versión. El siguiente
bloque ya incorporó horarios, precios y excepciones con permisos contextuales. El catálogo público
`/canchas` y los slots teóricos también están implementados. Corresponde completar la validación
visual/E2E a 360 px y cerrar el aislamiento de la Iteración 3 antes de declarar el flujo listo para
piloto.

La Iteración 4 tiene alcance, contratos, modelo de concurrencia, seguridad y criterios de cierre
definidos en [ITERATION_4_RESERVATIONS_PLAN.md](ITERATION_4_RESERVATIONS_PLAN.md). El bloque 4A ya
incorpora `V10`, dominio, persistencia, historial append-only y configuración tipada del hold. Antes
de considerar 4B cerrado corresponde aplicar la migración y verificar el constraint de
solapamiento en PostgreSQL real. El caso de uso y `POST /reservations` ya están implementados con
cotización backend, expiración transaccional e idempotencia; la siguiente implementación será 4C
después de esa prueba de infraestructura.

Las demás capacidades aceptadas se distribuyeron entre Iteraciones 4B, 5B, 6B, 7B, 8 y 9. La matriz
de decisión completa está en [ANALISIS_REQUERIMIENTOS_IMPORTADOS.md](ANALISIS_REQUERIMIENTOS_IMPORTADOS.md).

## Iteración 5 iniciada: partidos abiertos

El bloque 5A ya incorpora la creación y publicación de partidos vinculados exclusivamente a una
reserva propia, confirmada y futura. La cancha, organización, horario y deporte se derivan en el
backend; se incluyen catálogo público, detalle por slug no secuencial y auditoría. Las migraciones
`V13` y `V14` están aplicadas y el esquema fue validado contra PostgreSQL. El siguiente corte es 5B:
participantes, cupos, retiro idempotente y lista de espera con control transaccional.
