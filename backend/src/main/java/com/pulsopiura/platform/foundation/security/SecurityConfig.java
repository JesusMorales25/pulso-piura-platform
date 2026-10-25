package com.pulsopiura.platform.foundation.security;

import java.util.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
@EnableScheduling
public class SecurityConfig {
    private final OidcRoleClaims roleClaims;
    private final SharedWriteRateLimit writeRateLimit;

    public SecurityConfig(OidcRoleClaims roleClaims, SharedWriteRateLimit writeRateLimit) {
        this.roleClaims = roleClaims;
        this.writeRateLimit = writeRateLimit;
    }

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable())
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterAfter(
                        new WriteRateLimitFilter(writeRateLimit),
                        BearerTokenAuthenticationFilter.class)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers("/api/v1/health", "/actuator/health")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/v1/venues",
                                                "/api/v1/venues/**",
                                                "/api/v1/spaces/*/availability",
                                                "/api/v1/spaces/*/bookable-slots",
                                                "/api/v1/venue-catalogs",
                                                "/api/v1/venue-catalogs/districts",
                                                "/api/v1/public/spaces/*/photos",
                                                "/api/v1/public/spaces/*/photos/*/image",
                                                "/api/v1/public/visual-assets",
                                                "/api/v1/public/visual-assets/*/image",
                                                "/api/v1/businesses",
                                                "/api/v1/businesses/*/image",
                                                "/api/v1/payment-orders/capabilities",
                                                "/api/v1/external-payments/capabilities",
                                                "/api/v1/matches",
                                                "/api/v1/matches/*")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .oauth2ResourceServer(
                        oauth ->
                                oauth.jwt(
                                        jwt ->
                                                jwt.jwtAuthenticationConverter(
                                                        jwtAuthenticationConverter())))
                .build();
    }

    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(
                jwt ->
                        roleClaims.roles(jwt).stream()
                                .map(
                                        role ->
                                                (GrantedAuthority)
                                                        new SimpleGrantedAuthority("ROLE_" + role))
                                .toList());
        return converter;
    }
}
