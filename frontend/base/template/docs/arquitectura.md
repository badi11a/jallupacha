# Arquitectura de la aplicación consumidora

Base Angular 0.2.1, en validación técnica. Decisiones iniciales: SPA, componentes independientes, TypeScript estricto, formularios reactivos tipados, Signals y RxJS, CSS nativo y kit con ámbito `ui-root`.

La raíz compone configuración y proveedores. `core/platform` ofrece sesión por cookies, HTTP acotado y cambios pendientes; `session.ts` adapta el contrato inicial del consumidor. `features` contiene las funcionalidades; `shared/ui` contiene presentación genérica. Core/UI no dependen de funcionalidades. Los destinos se definen en rutas, con carga diferida cuando corresponde.

Antes de construir el producto: documentar requisitos, perfiles, política de API, contrato de datos, navegación y ambientes. La muestra de formulario no persiste datos ni define una funcionalidad obligatoria.

Contrato inicial de sesión: GET `/api/auth/me`, POST `/api/auth/login` con correo/contraseña y POST `/api/auth/logout`. Configurable en `session.ts`; identidad validada y mantenida en memoria. Cookie de sesión HttpOnly y CSRF según contrato del servidor. El núcleo solo admite API del mismo origen; cambiar esta condición exige nuevo diseño y verificaciones. Los tiempos máximos de petición son configurables y no sustituyen la expiración de sesión del servidor.

Cada producto documenta despliegue HTTPS, cabeceras, CSP y compatibilidad antes de liberar; la generación no comprueba infraestructura. No incluir secretos en configuración pública del navegador.

Verificar con la CI entregada, pruebas de consumidores, revisión visual/accesibilidad y aceptación del producto. Las versiones y hashes de procedencia están en `.frontend-base.json`; un cambio incompatible necesita migración explícita.
