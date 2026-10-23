package com.pulsopiura.platform.foundation.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

public class WriteRateLimitFilter extends OncePerRequestFilter {
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private final SharedWriteRateLimit limiter;

    public WriteRateLimitFilter(SharedWriteRateLimit limiter) {
        this.limiter = limiter;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!SAFE_METHODS.contains(request.getMethod())
                && request.getRequestURI().startsWith("/api/")
                && authentication instanceof JwtAuthenticationToken token
                && token.isAuthenticated()) {
            var jwt = token.getToken();
            if (!limiter.allow(jwt.getIssuer().toString(), jwt.getSubject())) {
                response.setStatus(429);
                response.setHeader("Retry-After", "60");
                response.setContentType("application/problem+json");
                response.getWriter()
                        .write(
                                "{\"status\":429,\"title\":\"Demasiadas operaciones\",\"detail\":\"Espera un minuto antes de volver a intentar.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
