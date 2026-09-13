package com.pulsopiura.platform.shared.api;

import com.pulsopiura.platform.reservations.application.ReservationConflictException;
import com.pulsopiura.platform.reservations.application.ReservationRateLimitException;
import com.pulsopiura.platform.venues.application.SlotNotBookableException;
import java.net.URI;
import java.util.NoSuchElementException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail invalidInput(IllegalArgumentException error) {
        return problem(HttpStatus.BAD_REQUEST, "Entrada inválida", error.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail forbidden(AccessDeniedException error) {
        return problem(HttpStatus.FORBIDDEN, "Acceso denegado", error.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    ProblemDetail notFound(NoSuchElementException error) {
        return problem(HttpStatus.NOT_FOUND, "Recurso no encontrado", error.getMessage());
    }

    @ExceptionHandler(SlotNotBookableException.class)
    ProblemDetail slotNotBookable(SlotNotBookableException error) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "Franja no reservable", error.getMessage());
    }

    @ExceptionHandler(ReservationConflictException.class)
    ProblemDetail reservationConflict(ReservationConflictException error) {
        return problem(HttpStatus.CONFLICT, "Horario no disponible", error.getMessage());
    }

    @ExceptionHandler(ReservationRateLimitException.class)
    ProblemDetail reservationRateLimit(ReservationRateLimitException error) {
        return problem(
                HttpStatus.TOO_MANY_REQUESTS, "Límite de reservas pendientes", error.getMessage());
    }

    @ExceptionHandler({
        IllegalStateException.class,
        DataIntegrityViolationException.class,
        ObjectOptimisticLockingFailureException.class
    })
    ProblemDetail conflict(RuntimeException error) {
        var detail =
                error instanceof IllegalStateException
                        ? error.getMessage()
                        : error instanceof ObjectOptimisticLockingFailureException
                                ? "El recurso fue modificado por otro usuario"
                                : "El recurso entra en conflicto con datos existentes";
        return problem(HttpStatus.CONFLICT, "Conflicto", detail);
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail) {
        var p = ProblemDetail.forStatusAndDetail(status, detail);
        p.setTitle(title);
        p.setType(URI.create("https://pulsopiura.pe/problems/" + status.value()));
        return p;
    }
}
