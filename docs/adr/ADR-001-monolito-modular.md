# ADR-001: monolito modular para el backend

**Estado:** aceptado · **Fecha:** 2026-09-02

Se implementará un único desplegable Spring Boot con módulos de dominio y límites explícitos. Reduce complejidad operativa al inicio y permite extraer servicios solo cuando métricas, equipos o escalamiento independiente lo justifiquen.
