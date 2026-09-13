package com.pulsopiura.platform.foundation.security;

import java.util.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable())
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
                                                "/api/v1/businesses",
                                                "/api/v1/payment-orders/capabilities",
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
                jwt -> {
                    var realmAccess = jwt.getClaimAsMap("realm_access");
                    if (realmAccess == null) return List.of();
                    var roles = realmAccess.get("roles");
                    if (!(roles instanceof Collection<?> values)) return List.of();
                    return values.stream()
                            .filter(String.class::isInstance)
                            .map(String.class::cast)
                            .map(
                                    role ->
                                            (GrantedAuthority)
                                                    new SimpleGrantedAuthority("ROLE_" + role))
                            .toList();
                });
        return converter;
    }
}
