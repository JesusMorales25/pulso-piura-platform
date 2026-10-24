package com.pulsopiura.platform.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.reset;

import com.pulsopiura.platform.identity.infrastructure.persistence.UserEntity;
import com.pulsopiura.platform.identity.infrastructure.persistence.UserRepository;
import jakarta.persistence.EntityManager;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

/** Opt-in concurrency regression; never runs against a remote or production database. */
@SpringBootTest
@EnabledIfSystemProperty(named = "runIdentityDatabaseTests", matches = "true")
class CurrentUserConcurrencyDatabaseTest {
    @Autowired CurrentUserService currentUsers;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entityManager;
    @MockitoSpyBean UserRepository users;

    @Test
    void simultaneousFirstRequestsCreateOneUserAndBothSucceed() throws Exception {
        try (var connection = Objects.requireNonNull(jdbc.getDataSource()).getConnection()) {
            assertThat(connection.getMetaData().getURL())
                    .matches("jdbc:postgresql://(127\\.0\\.0\\.1|localhost):[0-9]+/.*test.*");
        }
        var subject = "identity-race-" + UUID.randomUUID();
        var jwt =
                Jwt.withTokenValue("test-only")
                        .header("alg", "RS256")
                        .subject(subject)
                        .claim("email", "identity-race@example.test")
                        .claim("name", "Concurrency Test")
                        .claim("email_verified", true)
                        .build();
        var firstReads = new CyclicBarrier(2);
        var reads = new AtomicInteger();
        doAnswer(
                        invocation -> {
                            var result =
                                    entityManager
                                            .createQuery(
                                                    "select u from UserEntity u where u.identitySubject = :subject",
                                                    UserEntity.class)
                                            .setParameter("subject", subject)
                                            .getResultStream()
                                            .findFirst();
                            if (result.isEmpty() && reads.incrementAndGet() <= 2) {
                                firstReads.await(15, TimeUnit.SECONDS);
                            }
                            return result;
                        })
                .when(users)
                .findByIdentitySubject(subject);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> currentUsers.provision(jwt));
            var second = executor.submit(() -> currentUsers.provision(jwt));
            assertThat(first.get(30, TimeUnit.SECONDS).id())
                    .isEqualTo(second.get(30, TimeUnit.SECONDS).id());
            assertThat(
                            jdbc.queryForObject(
                                    "select count(*) from app.users where identity_subject = ?",
                                    Long.class,
                                    subject))
                    .isEqualTo(1L);
            assertThat(
                            jdbc.queryForObject(
                                    "select count(*) from app.player_profiles where user_id in (select id from app.users where identity_subject = ?)",
                                    Long.class,
                                    subject))
                    .isEqualTo(1L);
        } finally {
            reset(users);
            jdbc.update(
                    "delete from app.audit_events where actor_user_id in (select id from app.users where identity_subject = ?)",
                    subject);
            jdbc.update(
                    "delete from app.player_profiles where user_id in (select id from app.users where identity_subject = ?)",
                    subject);
            jdbc.update("delete from app.users where identity_subject = ?", subject);
        }
    }
}
