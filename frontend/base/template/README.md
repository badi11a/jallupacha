# Aplicación base Angular — 0.2.1

Consumidor neutral del núcleo y kit. Configurar el contrato de sesión en `src/app/session.ts` antes de integrar con una API. No contiene cuentas, credenciales, datos de negocio ni un mecanismo de autenticación simulado. El formulario de ejemplo demuestra interacción sin persistencia.

Instalar con `npm ci`, comprobar con `npm test` y `npm run build`, ejecutar con `npm start`. Para desarrollo con API local, declarar un proxy de mismo origen y comprobar las cookies y CSRF. No incluir secretos en configuración compilada del navegador.

C-052: las pruebas declaran explícitamente `@types/node` como dependencia de desarrollo; la instalación no debe depender de tipos presentes en otro proyecto o directorio ancestro. Migración desde 0.2.0: revisar paquete y lockfile para incorporar esa dependencia, conservar personalizaciones y repetir instalación, pruebas y compilación en un directorio independiente.

Mantener `core/platform` y `shared/ui` como fuentes versionadas; funcionalidades bajo `features`. La procedencia está en `.frontend-base.json`. Desde el repositorio fuente, `node frontend/tools/create-starter.mjs --check <carpeta>` comprueba versión/hashes; no sobrescribe cambios locales. Una actualización necesita revisión de diferencias y migración explícita.

La API de identidad devuelve `userId` entero positivo, `displayName`, `email`, `profiles` no vacío de códigos en mayúscula. Sesión por cookies HttpOnly, token CSRF legible con nombre configurado y cabecera correspondiente en escrituras. El núcleo limita credenciales y CSRF a la API configurada del mismo origen. El producto define perfiles, políticas y autorización en el servidor.

Aplicar SDD: documentar requisito, clasificación del hallazgo, diseño y criterios antes de cambiar comportamiento; registrar pruebas y revisión en el mismo cambio. Comprobar sesión inválida, errores y respuestas tardías, formulario limpio/modificado, fallos de guardado, teclado/foco, contraste, 200 % y 320 px. Mantener análisis estático, dependencias, secretos, pruebas y presupuesto en CI. No declarar conformidad con comprobaciones no ejecutadas.

Estado: base en validación técnica. La generación/compilación no acredita aceptación con personas, accesibilidad integral ni condiciones de producción.
