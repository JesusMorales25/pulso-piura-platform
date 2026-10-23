package com.pulsopiura.platform.foundation.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class WriteRateLimitFilterTest {
    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatedWriteStopsAtLimitAndDoesNotReachBusinessOperation() throws Exception {
        var limiter = mock(SharedWriteRateLimit.class);
        var jwt =
                Jwt.withTokenValue("test")
                        .header("alg", "RS256")
                        .issuer("https://issuer.test")
                        .subject("actor-1")
                        .issuedAt(Instant.now())
                        .expiresAt(Instant.now().plusSeconds(60))
                        .build();
        SecurityContextHolder.getContext()
                .setAuthentication(new JwtAuthenticationToken(jwt, List.of()));
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        new WriteRateLimitFilter(limiter)
                .doFilter(new MockHttpServletRequest("POST", "/api/v1/matches"), response, chain);
        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
        assertThat(chain.getRequest()).isNull();
        verify(limiter).allow("https://issuer.test", "actor-1");
    }

    @Test
    void readAndAnonymousRequestStillReachNormalAuthenticationAndAuthorization() throws Exception {
        var limiter = mock(SharedWriteRateLimit.class);
        var chain = new MockFilterChain();
        var response = new MockHttpServletResponse();
        new WriteRateLimitFilter(limiter)
                .doFilter(new MockHttpServletRequest("GET", "/api/v1/matches"), response, chain);
        assertThat(chain.getRequest()).isNotNull();
        verifyNoInteractions(limiter);
    }
}
