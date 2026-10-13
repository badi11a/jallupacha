# Jallupacha

Sistema web institucional para la administración de procesos, macroprocesos y riesgos.

## Tecnologías

| Componente | Tecnología |
|---|---|
| Frontend | Angular 22, TypeScript |
| Backend | NestJS 11, Node.js 24 |
| Base de datos | Oracle Database 19c |
| Persistencia | TypeORM, node-oracledb |
| Arquitectura | Monolito modular, API REST |
| Despliegue objetivo | On-premise |

## Estado del proyecto

Proyecto en desarrollo incremental mediante **Spec-Driven Development (SDD)**.

El piloto incluye funcionalidades de administración de catálogos, perfiles, procesos, fichas, mapa interno, registro de riesgos y auditoría. Las funcionalidades pendientes se incorporan progresivamente según los requisitos aprobados.

La autenticación mediante Google Workspace institucional está postergada. El mecanismo de acceso actual es exclusivamente para desarrollo local: **no debe exponerse a una red ni utilizarse con datos reales**.

## Estructura del repositorio

```text
jallupacha/
├── backend/          # API, lógica de negocio y persistencia
├── frontend/         # Aplicación Angular
├── docs/             # Especificaciones y arquitectura
├── AGENTS.md         # Instrucciones y principios SDD
├── package.json      # Scripts y dependencias del proyecto
└── README.md
```

## Desarrollo local

**Requisitos:** Node.js 24, npm 11, Oracle Database 19c y acceso a un esquema Oracle de desarrollo.

```bash
git clone https://github.com/badi11a/jallupacha.git
cd jallupacha
npm ci
```

Configurar `backend/.env` a partir de `backend/.env.example`. Preparar los usuarios y permisos Oracle correspondientes antes de aplicar las migraciones.

```bash
npm run db:migrate
npm run db:grant
npm run start:dev
```

Los permisos de la cuenta de ejecución se aplican con `db:grant` desde `backend/database/grant-runtime.sql`; `CREATE SESSION` lo otorga un operador autorizado con `backend/database/grant-system.sql`.

Direcciones locales por defecto:

- Frontend: `http://127.0.0.1:4200`
- Backend: `http://127.0.0.1:3000/api`

## Configuración por ambiente

La configuración se define con variables de entorno (ver [`backend/.env.example`](backend/.env.example) y [arquitectura](docs/arquitectura.md#configuración-por-ambiente)). El backend valida las variables al iniciar y no arranca si faltan. Nunca versionar `.env` ni credenciales.

| Ambiente | APP_ENV / NODE_ENV | Cómo configurar |
|---|---|---|
| Local | `local` / `development` | Copiar `backend/.env.example` a `backend/.env` y completar conexión y contraseñas Oracle. `npm run start:dev`. |
| Desarrollo | `development` / `production` | Definir las variables en el servicio del servidor (con `AUTH_MODE=google`, sin modo demo). `npm ci && npm run build && npm run db:migrate && npm run db:grant`, luego `npm start --workspace backend`. |
| Producción | `production` / `production` | Igual que desarrollo, con cuentas y servicio Oracle institucionales entregados por el administrador. Probar antes en desarrollo. |

El frontend compilado (`frontend/dist`) es el mismo para todos los ambientes y llama a `/api` en forma relativa: el servidor web institucional debe servirlo y reenviar `/api` al backend.

## Verificaciones

```bash
npm run build
npm test
npm run test:frontend
npm run test:api
npm run audit:dependencies
```

Las pruebas de integración con Oracle requieren un entorno de base de datos configurado. Estos comandos se documentan como procedimientos disponibles, no como verificaciones ejecutadas en esta entrega.

## Documentación

- [Especificación funcional](docs/especificacion.md)
- [Arquitectura y decisiones técnicas](docs/arquitectura.md)
- [Instrucciones SDD](AGENTS.md)
- [Release 01](docs/release01_navegable.md)
- [Ciclo de procesos pendiente](docs/incremento03_ciclo_procesos.md)

La fuente de verdad de los requisitos es [`docs/referencias/Requisitos_Sistema_Procesos_v13.xlsx`](docs/referencias/Requisitos_Sistema_Procesos_v13.xlsx). Los cambios funcionales deben respetar las especificaciones, criterios de aceptación y principios de `AGENTS.md`.

## Licencia

Consultar [LICENSE](LICENSE).
