# 17. Plantilla para solicitar módulos a una IA

## Instrucción base reutilizable

```text
Antes de realizar cambios, lee completamente:

1. outputs/documentacion_proyecto/00_contexto_maestro_desarrollo_ia.md
2. outputs/documentacion_proyecto/09_registro_decisiones.md
3. la documentación del módulo relacionado
4. el código, pruebas y AGENTS.md del repositorio

Respeta Spring Boot modular, Next.js, Keycloak/OIDC, PostgreSQL, Flyway,
OpenAPI, seguridad multitenant y las reglas de Definition of Done.

No cambies arquitectura, dependencias principales, modelo de identidad,
autorización ni alcance sin señalar la contradicción y solicitar decisión.
```

## Plantilla de tarea

```text
TÍTULO
[Nombre concreto de la historia o módulo]

OBJETIVO
[Qué resultado debe conseguirse y para qué actor]

ALCANCE
- [Incluido]
- [Incluido]

FUERA DE ALCANCE
- [No desarrollar]
- [No modificar]

REQUISITOS RELACIONADOS
- RF-...
- RNF-...
- DEC-...

REGLAS DE NEGOCIO
1. ...
2. ...

SEGURIDAD Y PERMISOS
- permiso requerido: ...
- tenant/recurso: ...
- auditoría: ...
- datos personales: ...

CRITERIOS DE ACEPTACIÓN
1. Dado ..., cuando ..., entonces ...
2. ...

CASOS NEGATIVOS
- sin autenticación → 401
- sin permiso → 403
- otro tenant → 403/404 según política
- estado inválido → 409/422 según contrato

CAMBIOS ESPERADOS
- API:
- base de datos:
- backend:
- frontend:
- pruebas:
- documentación:

RESTRICCIONES
- no agregar dependencias sin justificar
- no romper compatibilidad
- no introducir funciones fuera del alcance

ENTREGA
1. resumen del cambio
2. archivos modificados
3. pruebas ejecutadas y resultado
4. supuestos
5. riesgos o trabajo pendiente
```

## Formato de respuesta exigido a la IA

Antes de implementar:

```text
Contexto comprendido:
Alcance:
Fuera de alcance:
Riesgos:
Archivos previstos:
Pruebas previstas:
```

Después de implementar:

```text
Resultado:
Cambios realizados:
Pruebas ejecutadas:
Resultado de seguridad/tenant:
Migraciones y API:
Supuestos:
Pendientes:
```

## Ejemplo breve

```text
TÍTULO
Crear partido deportivo

OBJETIVO
Permitir que un jugador autenticado cree un partido con deporte, fecha,
ubicación, costo, mínimo y máximo de participantes.

FUERA DE ALCANCE
Reservar automáticamente una cancha, cobrar o recomendar jugadores.

SEGURIDAD
Requiere match:create. El creador queda como captain_user_id. El cliente no
puede asignar otro capitán ni organización sin membership autorizada.

CRITERIOS
- máximo debe ser mayor o igual que mínimo
- fecha futura
- costo entero no negativo
- respuesta 201 con Location
- evento de auditoría
- pruebas 401, 403, validación y tenant
```

