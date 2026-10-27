# Jallupacha versión 15

Sistema institucional de gestión de procesos, macroprocesos, estructura organizacional y riesgos. La fuente de requisitos es `docs/referencias/Requisitos_Sistema_Procesos_v15.xlsx`; la [especificación](docs/producto/especificacion_v15.md) y la [arquitectura](docs/producto/arquitectura_v15.md) definen el producto vigente.

## Organización

```text
backend/src/
  app.module.ts       Composición de una sola aplicación NestJS
  database/           Conexión compartida, migraciones, instalación y semillas
  auth/               Acceso y sesiones
  audit/              Bitácora y eventos de seguridad
  identity/           Usuarios y perfiles
  structure/          Macroprocesos, tipos y unidades
  process/            Mapa, fichas, relaciones y ciclo de vida
  risk/               Riesgos y sus catálogos
  common/             Configuración, validación y controles compartidos
frontend/src/app/
  core/platform/      Núcleo configurable de sesión, HTTP y cambios pendientes
  core/auth/          Adaptación de identidad y navegación del producto
  features/processes/ Mapa, búsqueda, ficha y edición
  features/catalogs/  Unidades y tipos de proceso
  features/users/     Usuarios y perfiles
  features/audit/     Consulta de auditoría
  shared/ui/          Componentes genéricos y tokens
frontend/base/        Manifiesto y plantilla neutral versionada
frontend/tools/       Generador y verificaciones de arquitectura/seguridad
```

Cada dominio declara sus controladores y servicios en su módulo. Los servicios de captura separan estructura, ficha, ciclo de vida, riesgos y relaciones. Se mantiene un backend.

## Contratos

El frontend usa `/api/management` para mapa, búsqueda y captura. Los contratos institucionales paginados bajo `/api/processes`, `/api/process-map`, `/api/units` y los demás destinos documentados se conservan durante su consolidación. Los formatos de ambos contratos son distintos; no deben intercambiarse. Todos requieren sesión y política de autorización, además de CSRF en escrituras. El inicio de sesión es `/api/auth/login`.

Las rutas visibles permanecen `/mapa`, `/procesos`, `/unidades`, `/tipos-de-proceso`, `/usuarios` y `/auditoria`, con controles según perfiles y protección de cambios pendientes.

## Entorno local

- Node.js 24.15.x y npm 11.12.x, según los archivos de paquetes.
- Oracle Database 19c instalado directamente, sin Docker.
- Configuración por ambiente según `backend/.env.example`, sin credenciales en Git.
- Dependencias reproducibles mediante `npm ci`.
- Inicio con `npm run start:dev` desde la raíz.

Las migraciones y los permisos se administran mediante `db:migrate` y `db:grant` del backend, usando las cuentas y el procedimiento autorizado. Nunca se ejecutan reinstalaciones o reinicios destructivos como parte del arranque. `db:install:schema` es una herramienta explícita para la base histórica de esquema y datos genéricos: su existencia no acredita una instalación v15 completa. Exige confirmación del destino y no debe usarse como actualización de un ambiente existente.

Se conservan las identidades de migraciones aplicadas y sus dependencias por decisión del responsable. Los demás nombres describen funciones del producto. La documentación y los registros superados permanecen recuperables desde Git.

## Verificación

```sh
npm test --workspace backend
npm run test:e2e --workspace backend -- --runTestsByPath test/authorization.e2e-spec.ts test/processes.e2e-spec.ts test/demo-session.e2e-spec.ts test/management-authorization.e2e-spec.ts
npm test --workspace frontend
npm run check:source --workspace frontend
npm run test:base --workspace frontend
npm run check:contrast --workspace frontend
npm run build
npm run docs:openapi --workspace backend
```

Las pruebas Oracle requieren un esquema dedicado y configuración explícita; no se ejecutan sobre datos institucionales. Las pruebas automáticas no sustituyen la revisión humana ni la conformidad de producción.

## Estado y documentación

La versión de la especificación no equivale a una certificación de cumplimiento. Permanecen pendientes de cierre la coherencia de autenticación con Argon2id y proveedor local, la auditoría integral, validación Oracle y de instalación, CI de seguridad, carga y aceptación institucional. La base frontend 0.2.0 cuenta con la consolidación y verificaciones técnicas registradas en C-048 a C-050; los límites de evidencia y condiciones de adopción del kit están en su catálogo. No se presume conformidad WCAG integral.

- [Documentación](docs/README.md)
- [Reglas de desarrollo](AGENTS.md)
- [Guía UX](docs/diseno/marco_estandar_ux_institucional.md)
- [Base frontend y criterios SDD](docs/diseno/base-frontend.md)
- [Generación y mantenimiento de la plantilla](frontend/base/README.md)
- [Correcciones y verificaciones](docs/trazabilidad/correcciones.md)
- [Licencia](LICENSE)
