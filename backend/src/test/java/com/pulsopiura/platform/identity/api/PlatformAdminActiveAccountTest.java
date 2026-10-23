package com.pulsopiura.platform.identity.api;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.identity.application.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;

class PlatformAdminActiveAccountTest {
    @Test
    void inactiveAccountCannotReadGlobalDataEvenWithAValidPrivilegedToken() {
        var users = mock(CurrentUserService.class);
        var queries = mock(PlatformAdminQueryService.class);
        var jwt = mock(Jwt.class);
        when(users.provision(jwt)).thenThrow(new AccessDeniedException("Cuenta inactiva"));
        var controller =
                new PlatformAdminController(users, mock(CapabilityRequestService.class), queries);
        assertThatThrownBy(() -> controller.summary(jwt)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.users(jwt)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.capabilityRequests(jwt))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(queries);
    }
}
