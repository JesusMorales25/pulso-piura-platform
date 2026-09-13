# 21. Diagramas de secuencia

## Registro e inicio con Google

```mermaid
sequenceDiagram
    actor U as Usuario
    participant W as Next.js/BFF
    participant K as Keycloak
    participant G as Google
    participant A as Spring Boot
    participant D as PostgreSQL

    U->>W: Continuar con Google
    W->>K: Authorization Code + PKCE
    K->>G: Redirección OIDC
    U->>G: Autenticación/consentimiento
    G-->>K: Código/identidad verificada
    K->>K: Crear o vincular identidad
    K-->>W: Código OIDC
    W->>K: Intercambiar código
    K-->>W: Sesión + tokens Keycloak
    W->>A: GET /api/v1/me
    A->>A: Validar JWT issuer/audience
    A->>D: Buscar identity_subject
    alt primer acceso
        A->>D: Crear user y perfil pendiente
    end
    A-->>W: Usuario y onboardingStatus
    W-->>U: Inicio o completar perfil
```

## Crear y compartir partido

```mermaid
sequenceDiagram
    actor C as Capitán
    participant W as Next.js
    participant A as Match API
    participant Z as Authorization
    participant D as PostgreSQL
    participant N as Notifications

    C->>W: Completar formulario
    W->>A: POST /matches
    A->>Z: match:create + contexto
    Z-->>A: Permitido
    A->>A: Validar fecha/cupos/costo
    A->>D: Insertar Match + auditoría
    D-->>A: Match creado
    A-->>W: 201 + URL pública
    W-->>C: Mostrar enlace WhatsApp
    A-->>N: MatchPublished event
```

## Unirse, lista de espera y reemplazo

```mermaid
sequenceDiagram
    actor J as Jugador
    participant A as Match API
    participant D as PostgreSQL
    participant N as Notifications

    J->>A: POST /matches/{id}/participants
    A->>D: Cargar Match con versión
    alt cupo disponible
        A->>D: Insertar participante CONFIRMED
        A-->>J: 201 Confirmado
    else completo
        A->>D: Insertar WaitlistEntry
        A-->>J: 202 Lista de espera
    end

    Note over A,D: Más tarde, otro jugador cancela
    A->>D: Cancelar participante
    A->>D: Promover siguiente entrada activa
    A-->>N: ParticipantPromoted event
    N-->>J: Notificación de cupo
```

## Reserva concurrente

```mermaid
sequenceDiagram
    actor U1 as Usuario A
    actor U2 as Usuario B
    participant A as Reservation API
    participant D as PostgreSQL

    par solicitudes simultáneas
        U1->>A: POST /reservations (misma franja)
        U2->>A: POST /reservations (misma franja)
    end
    A->>D: Insertar HOLD A
    D-->>A: OK
    A->>D: Insertar HOLD B
    D-->>A: Violación exclusión de rango
    A-->>U1: 201 HOLD + expiresAt
    A-->>U2: 409 Horario no disponible
```

## Confirmación de pago por webhook futuro

```mermaid
sequenceDiagram
    participant P as Proveedor
    participant A as Payment API
    participant D as PostgreSQL
    participant R as Reservations/Matches
    participant N as Notifications

    P->>A: Webhook firmado
    A->>A: Validar firma y timestamp
    A->>D: Buscar provider_transaction_id
    alt ya procesado
        A-->>P: 200 idempotente
    else nuevo y válido
        A->>D: Registrar transacción
        A->>D: Actualizar PaymentOrder
        A-->>R: PaymentConfirmed event
        R->>D: Confirmar reserva/cupo si aplica
        A-->>N: Notificar confirmación
        A-->>P: 200
    end
```

## Cancelación con autorización contextual

```mermaid
sequenceDiagram
    actor O as Operador
    participant A as Reservation API
    participant Z as AuthorizationService
    participant D as PostgreSQL

    O->>A: POST /reservations/{id}/cancel
    A->>Z: canCancel(actor, reservationId)
    Z->>D: Membership + tenant + recurso
    alt sin permiso o tenant incorrecto
        Z-->>A: Denegado
        A-->>O: 403/404
    else permitido
        Z-->>A: Permitido
        A->>D: Cambiar estado + historial + audit
        A-->>O: 200 Cancelada
    end
```

