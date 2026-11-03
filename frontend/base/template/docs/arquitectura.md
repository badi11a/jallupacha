# Arquitectura de la aplicación consumidora

Base Angular 0.4.0, en validación técnica. Decisiones iniciales: SPA, componentes independientes, TypeScript estricto, formularios reactivos tipados, Signals y RxJS, Angular Material/CDK 22.2.1 para controles, tema Sass público, CSS para composición y kit con ámbito `ui-root`.

La raíz compone configuración y proveedores. `core/platform` ofrece sesión por cookies, HTTP acotado y cambios pendientes; `session.ts` adapta el contrato inicial del consumidor. `features` contiene las funcionalidades; `shared/ui` contiene presentación genérica. Core/UI no dependen de funcionalidades. Los destinos se definen en rutas, con carga diferida cuando corresponde.

Antes de construir el producto: documentar requisitos, perfiles, política de API, contrato de datos, navegación y ambientes. La muestra de formulario no persiste datos ni define una funcionalidad obligatoria.

Contrato inicial de sesión: GET `/api/auth/me`, POST `/api/auth/login` con correo/contraseña y POST `/api/auth/logout`. Configurable en `session.ts`; identidad validada y mantenida en memoria. Cookie de sesión HttpOnly y CSRF según contrato del servidor. El núcleo solo admite API del mismo origen; cambiar esta condición exige nuevo diseño y verificaciones. Los tiempos máximos de petición son configurables y no sustituyen la expiración de sesión del servidor.

Cada producto documenta despliegue HTTPS, cabeceras, CSP y compatibilidad antes de liberar; la generación no comprueba infraestructura. No incluir secretos en configuración pública del navegador.

Verificar con pruebas de consumidores, revisión visual y aceptación del producto. Las versiones y hashes de procedencia están en `.frontend-base.json`; un cambio incompatible necesita migración explícita.

El tema se carga desde shared/ui/styles/material.scss; no requiere fuentes remotas. UiDialogHost carga el contenedor Material al abrir el primer diálogo y conserva el contrato de UiDialogService. El tema del overlay copia las variables del consumidor. Tablas semánticas y paginación simple conservan su estructura; no se incorpora MatTable/MatPaginator sin necesidad concreta.
