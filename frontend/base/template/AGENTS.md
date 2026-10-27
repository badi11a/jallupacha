# Desarrollo de la base frontend

Aplicar la arquitectura y requisitos del producto consumidor. Esta base aporta mecanismos de cliente y ejemplos; sus perfiles, rutas de ejemplo y textos no sustituyen decisiones de producto.

## Antes de construir

1. Leer `docs/arquitectura.md`, requisitos del producto y registro `docs/cambios.md`.
2. Clasificar hallazgo: defecto de implementación, defecto de diseño o cambio de producto. Conservar especificación en el primero; corregir y revisar diseño antes de implementar el segundo; obtener autorización para cambiar alcance en el tercero.
3. Describir comportamiento esperado, consumidores, contrato y verificaciones concretas. Registrar todo en el mismo cambio de Git, con su revisión. No declarar pruebas no ejecutadas.

## Reglas obligatorias

- Componentes independientes de Angular, TypeScript estricto y funcionalidades bajo `features`. Infraestructura genérica en `core/platform`; presentación en `shared/ui`. Core/UI no importan funcionalidades.
- Cada producto define su adaptación de identidad, permisos, destinos y API. El almacenamiento del navegador no acredita una sesión. El servidor comprueba autorización en cada solicitud; las guardas solo controlan navegación.
- Mantener el ámbito de credenciales y CSRF del núcleo. No enviar credenciales a orígenes adicionales ni desactivar controles para resolver fallos de integración.
- No persistir contraseñas, tokens ni formularios en almacenamiento del navegador. No incluir secretos o datos reales en fuentes, registros o pruebas. Configuración compilada del frontend es pública.
- Validar entradas según contrato y renderizar mediante enlaces/interpolación de Angular; no usar saltos de sanitización, eval ni asignación directa de HTML externo.
- Formularios nuevos: controles reactivos tipados, error asociado al campo y foco apropiado; carga/fallo/guardado distinguibles, un envío pendiente y valores conservados al fallar.
- Pantallas de captura implementan `LeavesWithConfirmation` y guardas. Un contenedor agrega los cambios de sus editores. Salida limpia inmediata; con cambios, confirmación accesible; cancelar descarte conserva trabajo. Resolver cambios antes de cerrar sesión.
- Usar API pública y tokens del kit; no copiar componentes ni sus selectores internos. La navegación es configuración del producto.
- Cargas diferidas por funcionalidad y cancelación/invalidación de respuestas obsoletas. Medir antes de afirmar mejoras de rendimiento.
- Dependencias fijadas por lockfile; actualizar ante avisos altos/críticos mediante versiones compatibles y repetir verificaciones. No ejecutar actualizaciones forzadas sin evaluar el impacto.

## Cierre del cambio

Ejecutar `npm run check:source`, pruebas pertinentes y compilación. Cambios visuales: contraste efectivo, textos/recorrido, teclado, revisión visual, 200 % y 320 px se registran por separado. Añadir comprobaciones de sesión, CSRF, respuestas tardías y descarte cuando se afecten. La CI incluye análisis de seguridad, secretos, dependencias y presupuesto; comprobar su resultado antes de integrar.

Registrar versión, método, resultado y revisión en `docs/cambios.md`: aprobado en su alcance, fallido, no probado o no aplicable con justificación. Un consumidor de prueba no acredita adopción institucional ni producción. Actualizar componentes compartidos con revisión de procedencia/migración; nunca sobrescribir personalizaciones automáticamente.
