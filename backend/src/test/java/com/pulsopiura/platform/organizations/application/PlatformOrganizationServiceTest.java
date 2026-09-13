package com.pulsopiura.platform.organizations.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class PlatformOrganizationServiceTest {
    @Test
    void locksOrganizationBeforeProtectingLastOwner() {
        var jdbc = mock(JdbcTemplate.class);
        var audit = mock(AuditEventRepository.class);
        var organizationId = UUID.randomUUID();
        var ownerId = UUID.randomUUID();
        when(jdbc.query(contains("for update"), any(RowMapper.class), eq(organizationId)))
                .thenReturn(List.of(organizationId));
        when(jdbc.queryForObject(contains("select count(*)"), eq(Long.class), eq(organizationId)))
                .thenReturn(1L);
        var service = new PlatformOrganizationService(jdbc, audit);

        assertThatThrownBy(() -> service.removeOwner(UUID.randomUUID(), organizationId, ownerId))
                .isInstanceOf(IllegalStateException.class);

        var ordered = inOrder(jdbc);
        ordered.verify(jdbc)
                .query(contains("for update"), any(RowMapper.class), eq(organizationId));
        ordered.verify(jdbc)
                .queryForObject(contains("select count(*)"), eq(Long.class), eq(organizationId));
        verifyNoMoreInteractions(jdbc);
        verifyNoInteractions(audit);
    }
}
