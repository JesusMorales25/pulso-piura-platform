# ADR-002: Keycloak para identidad y Spring Security para autorización

**Estado:** aceptado · **Fecha:** 2026-09-02

Keycloak gestionará autenticación OIDC, registro, recuperación, sesiones y federación con Google. Spring Security validará JWT; el backend resolverá membresías, roles y permisos contextuales. La autorización de negocio nunca dependerá solo del frontend ni de atributos manipulables del token.
