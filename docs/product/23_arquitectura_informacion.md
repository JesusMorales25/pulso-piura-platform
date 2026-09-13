# 23. Arquitectura de información y navegación

## Principios UX

1. Móvil primero.
2. Un visitante puede explorar antes de registrarse.
3. La autenticación se solicita cuando el usuario intenta una acción personal.
4. La acción principal del jugador es encontrar o crear un partido.
5. La acción principal del complejo es administrar disponibilidad y reservas.
6. Los roles cambian capacidades, no crean aplicaciones separadas.
7. WhatsApp complementa la experiencia; no sustituye el estado oficial de la plataforma.
8. Ninguna pantalla revela datos personales o permisos innecesarios.

## Navegación pública

```text
Inicio
├── Partidos
│   ├── Explorar
│   └── Detalle público
├── Complejos
│   ├── Explorar
│   ├── Detalle
│   └── Canchas y horarios
├── Torneos
│   ├── Explorar
│   └── Tabla/fixture público
├── Cómo funciona
├── Seguridad y comunidad
└── Iniciar sesión
```

## Navegación del jugador autenticado

Barra móvil recomendada:

```text
Inicio | Explorar | Crear | Actividad | Perfil
```

### Inicio

- próximo partido;
- acciones pendientes;
- cupos cercanos o relevantes;
- reservas recientes;
- acceso a crear partido.

### Explorar

- partidos abiertos;
- complejos y disponibilidad;
- torneos públicos;
- filtros por deporte, zona, fecha, nivel y costo.

### Crear

- crear partido;
- reservar cancha;
- proponer partido sin cancha;
- crear torneo solo si tiene permiso.

### Actividad

- partidos creados;
- participaciones;
- lista de espera;
- reservas;
- cuotas/pagos;
- notificaciones relevantes.

### Perfil

- datos deportivos;
- asistencia y cumplimiento;
- privacidad;
- cuentas conectadas;
- organizaciones y roles;
- solicitudes para organizar partidos o publicar un complejo;
- soporte/cerrar sesión.

## Navegación de administración

En escritorio/tablet se utilizará navegación lateral:

```text
Resumen
Reservas
Calendario
Sedes y canchas
Partidos abiertos
Clientes/participantes
Pagos operativos
Torneos
Equipo y permisos
Reportes
Configuración
```

Solo se muestran módulos autorizados, pero Spring Boot vuelve a comprobar cada operación.

## Rutas frontend iniciales

| Ruta | Acceso | Propósito |
|---|---|---|
| `/` | público | propuesta y actividades destacadas |
| `/partidos` | público | explorar |
| `/partidos/[id]` | público/parcial | detalle y cupos |
| `/complejos` | público | buscar sedes |
| `/complejos/[slug]` | público | información y canchas |
| `/torneos/[slug]` | público | información, fixture y tabla |
| `/crear/partido` | autenticado | crear partido |
| `/actividad` | autenticado | participaciones y reservas |
| `/perfil` | autenticado | perfil y seguridad |
| `/admin/[orgId]` | membership | panel de organización |
| `/admin/[orgId]/reservas` | permiso | reservas/calendario |
| `/admin/[orgId]/torneos` | permiso | torneos asignados |
| `/plataforma/solicitudes` | `PLATFORM_ADMIN` | revisión de solicitudes de capacidades |

## Estados transversales de interfaz

Toda pantalla debe definir:

- carga inicial;
- vacío con siguiente acción;
- error recuperable;
- acceso denegado;
- recurso no encontrado;
- conectividad limitada;
- confirmación exitosa;
- operación parcialmente completada;
- datos desactualizados/conflicto.

## Accesibilidad

- objetivo WCAG 2.1 AA;
- navegación por teclado en paneles;
- foco visible;
- contraste suficiente;
- campos con etiquetas y errores asociados;
- no comunicar estados solo con color;
- blancos táctiles adecuados;
- lenguaje simple en español peruano.

