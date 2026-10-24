package com.pulsopiura.platform.identity.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByIdentitySubject(String identitySubject);

    @Query(
            value =
                    "SELECT 1 FROM pg_advisory_xact_lock(hashtextextended('identity:' || :subject, 0))",
            nativeQuery = true)
    int lockIdentitySubject(@Param("subject") String subject);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from UserEntity user where user.id = :id")
    Optional<UserEntity> findForUpdateById(@Param("id") UUID id);
}
