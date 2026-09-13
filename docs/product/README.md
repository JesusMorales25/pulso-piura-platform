# Plataforma deportiva Piura — Documentación del producto

**Estado:** Línea base v0.7  
**Fecha:** 1 de septiembre de 2026  
**Tipo de producto:** plataforma SaaS y marketplace deportivo multicomplejo  
**Mercado inicial:** Piura Metropolitana  

## Propósito

Esta documentación organiza el proyecto como un producto profesional propio. Los complejos, jugadores y organizadores aportan evidencia y necesidades recurrentes, pero ningún cliente individual controla el alcance del producto.

## Principio de producto

> La plataforma ayuda a que un partido ocurra: organiza participantes, completa cupos, controla confirmaciones y pagos, conecta espacios deportivos y simplifica mini campeonatos.

## Documentos

0. [Contexto maestro y reglas para desarrollo asistido por IA](00_contexto_maestro_desarrollo_ia.md)
1. [Visión, problema y alcance](01_vision_y_alcance.md)
2. [Actores y procesos](02_actores_y_procesos.md)
3. [Requisitos del producto](03_requisitos_producto.md)
4. [Arquitectura de solución](04_arquitectura.md)
5. [Modelo de datos](05_modelo_datos.md)
6. [Seguridad y privacidad](06_seguridad_y_privacidad.md)
7. [MVP y roadmap](07_mvp_y_roadmap.md)
8. [Validación de requisitos adicionales](08_validacion_requisitos.md)
9. [Registro de decisiones](09_registro_decisiones.md)
10. [Autenticación y autorización](10_autenticacion_autorizacion.md)
11. [Matriz de roles y permisos](11_matriz_roles_permisos.md)
12. [Modelo de amenazas](12_modelo_amenazas.md)
13. [Contrato inicial de API](13_contrato_api.md)
14. [Estrategia de calidad y pruebas](14_calidad_pruebas.md)
15. [Despliegue, observabilidad y continuidad](15_operacion_despliegue.md)
16. [Inicio de sesión y registro con Google](16_inicio_sesion_google.md)
17. [Plantilla para solicitar módulos a una IA](17_plantilla_tarea_ia.md)
18. [Modelo físico inicial de datos](18_modelo_datos_fisico.md)
19. [Épicas e historias del MVP](19_epicas_historias_mvp.md)
20. [Diseño modular de Spring Boot](20_modulos_springboot.md)
21. [Diagramas de secuencia](21_diagramas_secuencia.md)
22. [Plan de implementación](22_plan_implementacion.md)
23. [Arquitectura de información y navegación](23_arquitectura_informacion.md)
24. [Flujos UX por actor](24_flujos_ux.md)
25. [Reglas de reservas, cancelaciones y devoluciones](25_reglas_reservas.md)
26. [Reglas de partidos, cupos y reputación](26_reglas_partidos.md)
27. [Panel de complejos deportivos](27_panel_complejos.md)
28. [Panel de torneos](28_panel_torneos.md)
29. [Catálogo de eventos y notificaciones](29_eventos_notificaciones.md)
30. [Especificación de auditoría](30_especificacion_auditoria.md)
31. [Backlog listo para Iteración 0](31_backlog_iteracion_0.md)
32. [Pagos de reservas con Yape y Plin](32_pagos_yape_plin.md)
33. [Evaluación y selección del proveedor de pagos](33_seleccion_proveedor_pagos.md)
34. [Identidad visual y sistema de diseño](34_identidad_visual_sistema_diseno.md)
35. [Wireframes y alcance del prototipo](35_wireframes_prototipo.md)
36. [Checklist maestro del proyecto](36_checklist_maestro.md)
37. [Plan de pruebas de usabilidad del prototipo](37_pruebas_usabilidad_prototipo.md)

Al crear el repositorio de desarrollo, copiar [AGENTS.template.md](AGENTS.template.md) como `AGENTS.md` en la raíz y mover/copiar esta documentación a `docs/`.

## Gobierno del alcance

- El núcleo del producto se define por visión, estrategia y necesidades repetidas.
- Una solicitud individual se registra, pero no entra automáticamente al roadmap.
- Un requisito se prioriza por frecuencia, impacto, alineación, riesgo y esfuerzo.
- Las adaptaciones por cliente se resuelven mediante configuración siempre que sea posible.
- Las integraciones o desarrollos exclusivos se evalúan como productos separados.

## Próximos entregables

- Resultados cuantitativos de las encuestas.
- Mapa de procesos validado mediante entrevistas.
- backlog priorizado del MVP.
- prototipo web móvil.
- especificación técnica v1.0.
- plan de pruebas y despliegue.
