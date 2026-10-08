# Correcciones verificables

## C-001 — Presentación del entorno como producto

Clasificación: defecto de instrucciones y especificación/diseño. Autoría de la documentación inicial: asistente. El usuario informó presencia repetida de demo y ficticios en la interfaz; el código local todavía no ha sido inspeccionado por este asistente.

Origen: las instrucciones enfatizaban condiciones de prueba sin delimitar su presentación. La verificación inicial no cubría adecuadamente textos visibles. No es un cambio del alcance funcional aprobado.

Fuentes: regla de producto cerrado en AGENTS.md; separación entre requisitos y principios de v13; PT-01, PT-02 y PT-03. Los textos exactos propuestos son una corrección de diseño, no una transcripción de un requisito de v13.

Documentos corregidos: AGENTS.md (procedimiento reutilizable), especificacion.md (presentación y aceptación), arquitectura.md (frontera técnica y tratamiento de semilla).

Implementación prevista: alinear textos y nombres de semilla con la especificación; conservar controles y nombres internos. Sin borrado o recreación del esquema.

Verificación requerida: inspección de todas las pantallas implementadas, prueba de recorrido funcional y regresiones de autorización/sesión/auditoría. Registrar comandos, resultados y revisión en este cambio antes de integrar.

Estado: corrección documental C-001 v4 preparada para revisión del responsable; implementación y evidencia pendientes. No declarar el hallazgo resuelto todavía.
