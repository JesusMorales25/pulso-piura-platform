package com.pulsopiura.platform.payments.infrastructure.persistence;

import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ExternalPaymentStore {
    private final JdbcTemplate jdbc;

    public List<Proof> retentionCandidates(int days) {
        return jdbc.query(
                "select * from app.external_payment_proofs where status in ('CONFIRMED','REJECTED') and storage_key is not null and reviewed_at < now() - (? * interval '1 day') order by reviewed_at limit 100",
                this::map,
                days);
    }

    @org.springframework.transaction.annotation.Transactional
    public void imageDeleted(Proof proof) {
        jdbc.update(
                "update app.external_payment_proofs set storage_key=null where id=? and status in ('CONFIRMED','REJECTED')",
                proof.id());
        audit(
                proof.id(),
                proof.targetType(),
                proof.targetId(),
                null,
                "IMAGE_RETENTION_PURGED",
                null);
    }

    public boolean imageExists(
            String phone, String hash, UUID actor, TargetType type, UUID target) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "select exists(select 1 from app.external_payment_proofs where phone=? and image_sha256=? and (status not in ('REJECTED','CORRECTION_REQUIRED') or payer_user_id<>? or target_type<>? or target_id<>?))",
                        Boolean.class,
                        phone,
                        hash,
                        actor,
                        type.name(),
                        target));
    }

    public ExternalPaymentStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void savePreparation(UUID actor, TargetType type, UUID target, PreparationState state) {
        var p = state.preparation();
        var d = p.destination();
        jdbc.update(
                """
            insert into app.external_payment_preparations(payer_user_id,target_type,target_id,method,plan,amount_minor,expires_at,holder_name,phone,yape_enabled,plin_enabled)
            values (?,?,?,?,?,?,?,?,?,?,?) on conflict (payer_user_id,target_type,target_id) do update set
            method=excluded.method,plan=excluded.plan,amount_minor=excluded.amount_minor,expires_at=excluded.expires_at,
            holder_name=excluded.holder_name,phone=excluded.phone,yape_enabled=excluded.yape_enabled,plin_enabled=excluded.plin_enabled
            """,
                actor,
                type.name(),
                target,
                state.method(),
                state.plan(),
                p.amountMinor(),
                Timestamp.from(p.expiresAt()),
                d.holderName(),
                d.phone(),
                d.yapeEnabled(),
                d.plinEnabled());
    }

    public Optional<PreparationState> preparation(UUID actor, TargetType type, UUID target) {
        return jdbc
                .query(
                        "select * from app.external_payment_preparations where payer_user_id=? and target_type=? and target_id=?",
                        (r, n) ->
                                new PreparationState(
                                        new Preparation(
                                                r.getLong("amount_minor"),
                                                "PEN",
                                                r.getTimestamp("expires_at").toInstant(),
                                                new Destination(
                                                        r.getString("holder_name"),
                                                        r.getString("phone"),
                                                        r.getBoolean("yape_enabled"),
                                                        r.getBoolean("plin_enabled"),
                                                        true)),
                                        r.getString("method"),
                                        r.getString("plan")),
                        actor,
                        type.name(),
                        target)
                .stream()
                .findFirst();
    }

    public void clearPreparation(UUID actor, TargetType type, UUID target) {
        jdbc.update(
                "delete from app.external_payment_preparations where payer_user_id=? and target_type=? and target_id=?",
                actor,
                type.name(),
                target);
    }

    public void lockPayer(UUID actor) {
        jdbc.query(
                "select pg_advisory_xact_lock(hashtextextended(?, 0))",
                rs -> {},
                "external-payment:" + actor);
    }

    public Optional<Destination> destination(TargetType type, UUID receiver) {
        return jdbc
                .query(
                        "select * from app.external_payment_destinations where target_type=? and receiver_id=?",
                        (rs, n) ->
                                new Destination(
                                        rs.getString("holder_name"),
                                        rs.getString("phone"),
                                        rs.getBoolean("yape_enabled"),
                                        rs.getBoolean("plin_enabled"),
                                        rs.getBoolean("yape_enabled")
                                                || rs.getBoolean("plin_enabled")),
                        type.name(),
                        receiver)
                .stream()
                .findFirst();
    }

    public void destination(UUID actor, TargetType type, UUID receiver, Destination value) {
        jdbc.update(
                """
            insert into app.external_payment_destinations(target_type,receiver_id,holder_name,phone,yape_enabled,plin_enabled,updated_by,updated_at)
            values (?,?,?,?,?,?,?,now()) on conflict (target_type,receiver_id) do update set
            holder_name=excluded.holder_name,phone=excluded.phone,yape_enabled=excluded.yape_enabled,
            plin_enabled=excluded.plin_enabled,updated_by=excluded.updated_by,updated_at=excluded.updated_at
            """,
                type.name(),
                receiver,
                value.holderName(),
                value.phone(),
                value.yapeEnabled(),
                value.plinEnabled(),
                actor);
    }

    public Optional<Proof> replay(UUID actor, String key) {
        return jdbc
                .query(
                        "select * from app.external_payment_proofs where payer_user_id=? and idempotency_key=?",
                        this::map,
                        actor,
                        key)
                .stream()
                .findFirst();
    }

    public Proof get(UUID id) {
        return jdbc
                .query("select * from app.external_payment_proofs where id=?", this::map, id)
                .stream()
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Comprobante no encontrado"));
    }

    public List<Proof> list(TargetType type, UUID id) {
        return jdbc.query(
                "select * from app.external_payment_proofs where target_type=? and target_id=? order by created_at",
                this::map,
                type.name(),
                id);
    }

    public String payerName(UUID actor) {
        return jdbc.queryForObject(
                "select display_name from app.users where id=?", String.class, actor);
    }

    public boolean referenceExists(
            String phone,
            String method,
            String reference,
            UUID actor,
            TargetType type,
            UUID target) {
        return reference != null
                && Boolean.TRUE.equals(
                        jdbc.queryForObject(
                                "select exists(select 1 from app.external_payment_proofs where phone=? and method=? and reference=? and (status not in ('REJECTED','CORRECTION_REQUIRED') or payer_user_id<>? or target_type<>? or target_id<>?))",
                                Boolean.class,
                                phone,
                                method,
                                reference,
                                actor,
                                type.name(),
                                target));
    }

    public void save(Proof p) {
        jdbc.update(
                """
            insert into app.external_payment_proofs(id,target_type,target_id,receiver_id,payer_user_id,payer_name,amount_minor,method,plan,status,reference,holder_name,phone,storage_key,image_sha256,image_size,idempotency_key,ledger_order_id,created_at,review_expires_at)
            values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
                p.id(),
                p.targetType().name(),
                p.targetId(),
                p.receiverId(),
                p.payerUserId(),
                p.payerName(),
                p.amountMinor(),
                p.method(),
                p.plan(),
                p.status(),
                p.reference(),
                p.holderName(),
                p.phone(),
                p.storageKey(),
                p.sha256(),
                p.sizeBytes(),
                p.idempotencyKey(),
                p.ledgerOrderId(),
                Timestamp.from(p.createdAt()),
                Timestamp.from(p.reviewExpiresAt()));
    }

    public void linkSuperseded(Proof proof) {
        jdbc.update(
                "update app.external_payment_proofs set supersedes_proof_id=(select id from app.external_payment_proofs where target_type=? and target_id=? and payer_user_id=? and plan=? and status in ('REJECTED','CORRECTION_REQUIRED') and id<>? order by created_at desc limit 1) where id=?",
                proof.targetType().name(),
                proof.targetId(),
                proof.payerUserId(),
                proof.plan(),
                proof.id(),
                proof.id());
    }

    public void decide(UUID id, String status, String note, Instant now) {
        jdbc.update(
                "update app.external_payment_proofs set status=?,review_note=?,reviewed_at=? where id=?",
                status,
                note,
                Timestamp.from(now),
                id);
    }

    public void audit(
            UUID proof, TargetType type, UUID target, UUID actor, String action, String note) {
        jdbc.update(
                "insert into app.external_payment_events(id,proof_id,target_type,target_id,actor_user_id,action,note,occurred_at) values (?,?,?,?,?,?,?,now())",
                UUID.randomUUID(),
                proof,
                type.name(),
                target,
                actor,
                action,
                note);
    }

    private Proof map(ResultSet r, int n) throws SQLException {
        return new Proof(
                r.getObject("id", UUID.class),
                TargetType.valueOf(r.getString("target_type")),
                r.getObject("target_id", UUID.class),
                r.getObject("receiver_id", UUID.class),
                r.getObject("payer_user_id", UUID.class),
                r.getString("payer_name"),
                r.getLong("amount_minor"),
                r.getString("method"),
                r.getString("plan"),
                r.getString("status"),
                r.getString("reference"),
                r.getString("holder_name"),
                r.getString("phone"),
                r.getString("storage_key"),
                r.getString("image_sha256"),
                r.getLong("image_size"),
                r.getString("idempotency_key"),
                r.getObject("ledger_order_id", UUID.class),
                instant(r, "created_at"),
                instant(r, "review_expires_at"),
                instant(r, "reviewed_at"),
                r.getString("review_note"));
    }

    private Instant instant(ResultSet r, String column) throws SQLException {
        var t = r.getTimestamp(column);
        return t == null ? null : t.toInstant();
    }
}
