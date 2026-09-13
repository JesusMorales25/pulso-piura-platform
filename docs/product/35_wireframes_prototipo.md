# 35. Wireframes y alcance del prototipo

## Objetivo

Validar si un jugador entiende y completa el recorrido **descubrir → evaluar → reservar → pagar → confirmar**, antes de implementar backend, identidad o pasarela reales.

## Mapa de pantallas

```text
Inicio/Explorar
├── Detalle del partido
│   └── Inicio de sesión Google/demo
│       └── Confirmar reserva
│           ├── Yape
│           └── Plin/QR interoperable
│               └── Verificando pago
│                   └── Reserva confirmada
├── Crear actividad (avance conceptual)
├── Mi actividad (avance conceptual)
└── Perfil (avance conceptual)
```

## Wireframe 1 — Inicio

```text
[marca] [Piura] [perfil]
[saludo + fotografía deportiva]
[buscar deporte/zona/cancha] [filtros]
[fecha] [partido, zona, nivel]
        [precio + cupos]
        [ocupación + participantes]
[organizador verificado]
[Yape / Plin]
[UNIRME AL PARTIDO]
[ver detalles]
[siguiente partido]
[navegación inferior]
```

## Wireframe 2 — Detalle

```text
[volver] Detalle
[imagen]
[fecha/hora + partido + precio/cupos]
[organizador]
[reglas, inclusión y ubicación]
[total] [RESERVAR CUPO]
```

## Wireframe 3 — Acceso

```text
[volver]
[marca + confianza]
Ingresa para reservar
[CONTINUAR CON GOOGLE]
[usuario de prueba]
[términos y privacidad]
```

Google es simulado; la arquitectura productiva continúa siendo Google → Keycloak → Spring Security.

## Wireframe 4 — Pago

```text
[volver] Confirmar reserva
[resumen del partido]
[importe + comisión + total]
(•) Yape — aprobación en app
( ) Plin — QR interoperable
[HOLD 10 minutos + regla de confirmación]
[PAGAR S/ 15]
```

## Wireframes 5 y 6 — Verificación y éxito

```text
[indicador] Verificando pago
[referencia]
[simular confirmación]
          ↓
[confirmado]
[partido, importe, método, código]
[VER EN MI ACTIVIDAD]
```

## Interacciones implementadas

- CTA desde inicio y detalle;
- acceso Google/demo simulado;
- selección Yape/Plin;
- estado explícito de verificación;
- confirmación simulada;
- navegación inferior;
- retorno al inicio y acceso a actividad.

## Lo que el prototipo no hace

- no autentica con Google/Keycloak;
- no cobra ni crea QR real;
- no reserva un horario en backend;
- no guarda información;
- no envía WhatsApp ni notificaciones;
- no representa aprobación final de nombre o marca.

## Prueba con usuarios

Dar la consigna: “Encuentra un partido de fútbol intermedio para el sábado y reserva pagando con Plin”. Medir tiempo, finalización sin ayuda, dudas sobre costo/cupos, comprensión de verificación y confianza percibida. Después repetir con Yape.

## Criterios para avanzar

- al menos 80% completa el recorrido sin ayuda;
- al menos 90% identifica precio y cupos antes de pagar;
- nadie interpreta “verificando” como reserva confirmada;
- usuarios distinguen Yape y Plin;
- el CTA principal se reconoce en menos de 5 segundos;
- hallazgos críticos se corrigen antes de diseñar todas las pantallas.
