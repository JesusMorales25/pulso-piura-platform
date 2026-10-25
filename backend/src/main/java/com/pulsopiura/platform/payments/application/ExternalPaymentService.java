package com.pulsopiura.platform.payments.application;

import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import com.pulsopiura.platform.payments.application.port.PaymentProofStorage;
import com.pulsopiura.platform.payments.domain.*;
import com.pulsopiura.platform.payments.infrastructure.persistence.ExternalPaymentStore;
import com.pulsopiura.platform.reservations.application.ReservationConflictException;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;

@Service
public class ExternalPaymentService {
    private final ExternalPaymentStore store;
    private final ExternalPaymentTargets targets;
    private final PaymentProofStorage images;
    private final String mode;
    private final int reviewMinutes;

    public ExternalPaymentService(
            ExternalPaymentStore store,
            ExternalPaymentTargets targets,
            PaymentProofStorage images,
            @Value("${app.payments.mode:disabled}") String mode,
            @Value("${app.payments.review-minutes:30}") int reviewMinutes) {
        this.store = store;
        this.targets = targets;
        this.images = images;
        this.mode = mode;
        if (reviewMinutes < 1 || reviewMinutes > 60)
            throw new IllegalArgumentException("La revisión debe durar entre 1 y 60 minutos");
        this.reviewMinutes = reviewMinutes;
    }

    public boolean enabled() {
        return "external_manual".equals(mode);
    }

    public int reviewMinutes() {
        return reviewMinutes;
    }

    private void requireEnabled() {
        if (!enabled()) throw new IllegalStateException("Los pagos externos están deshabilitados");
    }

    @Transactional
    public Preparation prepare(
            UUID actor,
            TargetType type,
            UUID id,
            PaymentMethod method,
            PaymentPlan plan,
            String key) {
        requireEnabled();
        key = required(key, 100, "Idempotency-Key");
        store.lockPayer(actor);
        var context = targets.resolve(type, id, actor, true);
        for (var proof : store.list(type, id)) {
            if (proof.payerUserId().equals(actor)
                    && Set.of("PENDING_REVIEW", "NEEDS_RESOLUTION").contains(proof.status()))
                throw new ReservationConflictException(
                        "Ya tienes un comprobante pendiente; no vuelvas a transferir");
        }
        var recipient =
                store.destination(type, context.receiverId())
                        .orElseThrow(
                                () ->
                                        new ReservationConflictException(
                                                "El receptor aún no configuró sus datos de pago"));
        if ((method == PaymentMethod.YAPE && !recipient.yapeEnabled())
                || (method == PaymentMethod.PLIN && !recipient.plinEnabled()))
            throw new ReservationConflictException("El método no está habilitado por el receptor");
        var now = Instant.now();
        var deadline = now.plusSeconds(300);
        var start =
                type == TargetType.MATCH
                        ? context.match().startsAt()
                        : context.reservation().timeRange().startsAt();
        if (deadline.isAfter(start)) deadline = start;
        var hold = targets.prepare(context, actor, method, plan, key, now, deadline);
        store.audit(null, type, id, actor, "PAYMENT_PREPARED", method.name() + " / " + plan.name());
        var preparation =
                new Preparation(
                        hold.amountMinor(),
                        "PEN",
                        hold.expiresAt().truncatedTo(java.time.temporal.ChronoUnit.MICROS),
                        recipient);
        store.savePreparation(
                actor, type, id, new PreparationState(preparation, method.name(), plan.name()));
        return preparation;
    }

    @Transactional(readOnly = true)
    public PreparationState preparation(UUID actor, TargetType type, UUID id) {
        requireEnabled();
        // Only the original payer can retrieve the account snapshot; aggregate access is checked
        // too.
        var saved = store.preparation(actor, type, id);
        if (saved.isEmpty()) return null;
        targets.resolve(type, id, actor, false);
        return saved.get();
    }

    @Transactional(readOnly = true)
    public Destination destination(UUID actor, TargetType type, UUID id) {
        var context = targets.resolve(type, id, actor, false);
        return store.destination(type, context.receiverId())
                .orElse(new Destination("", "", false, false, false));
    }

    @Transactional
    public Destination configure(
            UUID actor,
            TargetType type,
            UUID id,
            String holder,
            String rawPhone,
            boolean yape,
            boolean plin) {
        requireEnabled();
        var context = targets.resolve(type, id, actor, true);
        targets.requireReviewer(context, actor);
        return saveDestination(actor, type, id, context.receiverId(), holder, rawPhone, yape, plin);
    }

    @Transactional(readOnly = true)
    public Destination organizationDestination(UUID actor, UUID organizationId) {
        var context =
                new ExternalPaymentTargets.Context(
                        TargetType.RESERVATION, organizationId, organizationId, null, null);
        targets.requireReviewer(context, actor);
        return store.destination(TargetType.RESERVATION, organizationId)
                .orElse(new Destination("", "", false, false, false));
    }

    @Transactional
    public Destination configureOrganization(
            UUID actor,
            UUID organizationId,
            String holder,
            String phone,
            boolean yape,
            boolean plin) {
        requireEnabled();
        var context =
                new ExternalPaymentTargets.Context(
                        TargetType.RESERVATION, organizationId, organizationId, null, null);
        targets.requireReviewer(context, actor);
        return saveDestination(
                actor,
                TargetType.RESERVATION,
                organizationId,
                organizationId,
                holder,
                phone,
                yape,
                plin);
    }

    private Destination saveDestination(
            UUID actor,
            TargetType type,
            UUID id,
            UUID receiverId,
            String holder,
            String rawPhone,
            boolean yape,
            boolean plin) {
        holder = required(holder, 120, "Nombre del titular");
        String phone = required(rawPhone, 20, "Celular").replace(" ", "").replace("+51", "");
        if (!phone.matches("9[0-9]{8}"))
            throw new IllegalArgumentException("Ingresa un celular peruano válido");
        var destination = new Destination(holder, phone, yape, plin, yape || plin);
        store.destination(actor, type, receiverId, destination);
        store.audit(
                null,
                type,
                id,
                actor,
                "DESTINATION_UPDATED",
                holder + " / " + phone + " / YAPE=" + yape + " / PLIN=" + plin);
        return destination;
    }

    @Transactional
    public ProofView submit(
            UUID actor,
            TargetType type,
            UUID id,
            PaymentMethod method,
            PaymentPlan plan,
            String reference,
            String key,
            String destinationVersion,
            byte[] input) {
        requireEnabled();
        key = required(key, 100, "Idempotency-Key");
        reference = optional(reference, 100, "Referencia");
        store.lockPayer(actor);
        var context = targets.resolve(type, id, actor, true);
        var replay = store.replay(actor, key);
        if (replay.isEmpty()) {
            for (var prior : store.list(type, id)) {
                if (prior.payerUserId().equals(actor)
                        && Set.of("PENDING_REVIEW", "NEEDS_RESOLUTION").contains(prior.status()))
                    throw new ReservationConflictException(
                            "Ya tienes un comprobante pendiente; consulta su estado antes de enviar otro");
            }
        }
        var uploaded = images.store(input);
        // Files are not transactional: register cleanup before any further database work.
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) images.delete(uploaded.key());
                    }
                });
        if (replay.isPresent()) {
            images.delete(uploaded.key());
            var p = replay.get();
            if (p.targetType() != type
                    || !p.targetId().equals(id)
                    || !p.method().equals(method.name())
                    || !p.plan().equals(plan.name())
                    || !Objects.equals(p.reference(), reference)
                    || !p.sha256().equals(uploaded.sha256()))
                throw new ReservationConflictException(
                        "La clave ya se utilizó para otro comprobante");
            return p.view(targets.reviewer(context, actor), actor);
        }
        Instant now = Instant.now();
        for (var prior : store.list(type, id)) {
            if (!prior.payerUserId().equals(actor)) continue;
            if ("NEEDS_RESOLUTION".equals(prior.status()))
                throw new ReservationConflictException(
                        "Hay un pago que requiere resolución del receptor");
            if ("PENDING_REVIEW".equals(prior.status())) {
                if (now.isBefore(prior.reviewExpiresAt()))
                    throw new ReservationConflictException(
                            "Ya tienes un comprobante pendiente de revisión");
                // Keep evidence of transferred money even after the hold has expired.
                throw new ReservationConflictException(
                        "El comprobante anterior venció; el receptor debe resolverlo antes de otro pago");
            }
        }
        var recipient =
                store.destination(type, context.receiverId())
                        .orElseThrow(
                                () ->
                                        new ReservationConflictException(
                                                "El receptor aún no configuró sus datos de pago"));
        if (!recipient
                .version()
                .equals(required(destinationVersion, 64, "Versión de la cuenta receptora")))
            throw new ReservationConflictException(
                    "La cuenta receptora cambió. No vuelvas a transferir; contacta al receptor para revisar el pago.");
        if ((method == PaymentMethod.YAPE && !recipient.yapeEnabled())
                || (method == PaymentMethod.PLIN && !recipient.plinEnabled()))
            throw new ReservationConflictException("El método no está habilitado por el receptor");
        if (store.referenceExists(recipient.phone(), method.name(), reference, actor, type, id))
            throw new ReservationConflictException(
                    "La referencia ya fue registrada para este receptor");
        if (store.imageExists(recipient.phone(), uploaded.sha256(), actor, type, id))
            throw new ReservationConflictException(
                    "Esta imagen coincide con un comprobante ya registrado para el receptor. No se creó otro pago; revisa tus comprobantes o contacta al receptor");
        Instant start =
                type == TargetType.MATCH
                        ? context.match().startsAt()
                        : context.reservation().timeRange().startsAt();
        Instant deadline = now.plusSeconds(reviewMinutes * 60L);
        if (deadline.isAfter(start)) deadline = start;
        var hold = targets.hold(context, actor, method, plan, key, now, deadline);
        var proof =
                new Proof(
                        UUID.randomUUID(),
                        type,
                        id,
                        context.receiverId(),
                        actor,
                        store.payerName(actor),
                        hold.amountMinor(),
                        method.name(),
                        plan.name(),
                        "PENDING_REVIEW",
                        reference,
                        recipient.holderName(),
                        recipient.phone(),
                        uploaded.key(),
                        uploaded.sha256(),
                        uploaded.sizeBytes(),
                        key,
                        hold.ledgerOrderId(),
                        now,
                        hold.expiresAt(),
                        null,
                        null);
        store.save(proof);
        store.clearPreparation(actor, type, id);
        store.linkSuperseded(proof);
        store.audit(proof.id(), type, id, actor, "PROOF_SUBMITTED", null);
        return proof.view(targets.reviewer(context, actor), actor);
    }

    @Transactional
    public List<ProofView> list(UUID actor, TargetType type, UUID id) {
        var proofs = store.list(type, id);
        var own = proofs.stream().filter(p -> p.payerUserId().equals(actor)).findFirst();
        var context =
                own.isPresent()
                        ? targets.resolveOwnEvidence(own.get(), actor, true)
                        : targets.resolve(type, id, actor, true);
        boolean reviewer = targets.reviewer(context, actor);
        var result = new ArrayList<ProofView>();
        for (var proof : store.list(type, id)) {
            if (!reviewer && !proof.payerUserId().equals(actor)) continue;
            expire(proof, actor, Instant.now());
            result.add(store.get(proof.id()).view(reviewer, actor));
        }
        return result;
    }

    @Transactional
    public ProofView decide(UUID actor, UUID id, Decision decision, String note) {
        requireEnabled();
        note = optional(note, 1000, "Nota");
        var initial = store.get(id);
        var context = targets.resolve(initial.targetType(), initial.targetId(), actor, true);
        targets.requireReviewer(context, actor);
        var proof = store.get(id);
        if (decision != Decision.CONFIRMED && note == null)
            throw new IllegalArgumentException("Indica el motivo de la decisión");
        if (proof.status().equals(decision.name()) && Objects.equals(note, proof.reviewNote()))
            return proof.view(true, actor);
        if (!Set.of("PENDING_REVIEW", "NEEDS_RESOLUTION").contains(proof.status()))
            throw new ReservationConflictException("El comprobante ya fue revisado");
        Instant now = Instant.now();
        String status = decision.name();
        if (decision == Decision.CONFIRMED && !targets.confirm(context, proof, actor, now))
            status = "NEEDS_RESOLUTION";
        if (!"CONFIRMED".equals(status)) targets.release(proof, now);
        store.decide(id, status, note, now);
        store.audit(id, proof.targetType(), proof.targetId(), actor, status, note);
        return store.get(id).view(true, actor);
    }

    @Transactional(readOnly = true)
    public byte[] image(UUID actor, UUID id) {
        var p = store.get(id);
        if (!actor.equals(p.payerUserId())) {
            var context = targets.resolve(p.targetType(), p.targetId(), actor, false);
            if (!targets.reviewer(context, actor))
                throw new AccessDeniedException("Sin acceso al comprobante");
        }
        if (p.storageKey() == null)
            throw new NoSuchElementException("La imagen cumplió su plazo de conservación");
        return images.read(p.storageKey());
    }

    private void expire(Proof proof, UUID actor, Instant now) {
        if ("PENDING_REVIEW".equals(proof.status()) && !now.isBefore(proof.reviewExpiresAt())) {
            targets.release(proof, now);
            store.decide(
                    proof.id(),
                    "NEEDS_RESOLUTION",
                    "Venció el plazo de revisión; verificar el dinero recibido sin recuperar el cupo",
                    now);
            store.audit(
                    proof.id(),
                    proof.targetType(),
                    proof.targetId(),
                    actor,
                    "NEEDS_RESOLUTION",
                    "REVIEW_EXPIRED");
        }
    }

    private String required(String text, int limit, String field) {
        String value = optional(text, limit, field);
        if (value == null) throw new IllegalArgumentException(field + " es obligatorio");
        return value;
    }

    private String optional(String text, int limit, String field) {
        if (text == null || text.isBlank()) return null;
        var value = text.trim();
        if (value.length() > limit)
            throw new IllegalArgumentException(field + " supera el límite permitido");
        return value;
    }
}
