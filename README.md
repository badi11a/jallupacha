# Jallupacha

Sistema web institucional para la gestión, gobierno y administración de procesos, macroprocesos y riesgos institucionales.

---

## Estado actual del proyecto

El proyecto implementa la versión funcional y visual del **MVP v14 de Operador Único** (`C-011`), desarrollada bajo el paradigma **Spec-Driven Development (SDD)** con un kit de componentes desacoplado, tokens semánticos del Sistema de Diseño Digital (SDD) y total conformidad de accesibilidad WCAG 2.2 AA.

### Módulos y vistas operativas

1. **Mapa de Procesos Institucional (`/mapa`)**:
   - Visualización jerárquica por familias (`Estratégicos`, `Misionales`, `De apoyo`) con bandas de color semánticas estables.
   - Filtro integrado mediante control segmentado accesible (patrón *radio group* con tokens de radio de 7 px) y buscador reactivo en tiempo real con normalización sin tildes.
   - Resumen de procesos y tipos por macroproceso, enlaces contextuales a detalle y diálogo de ayuda modal.

2. **Detalle de Macroproceso (`/mapa/macroprocesos/:id`)**:
   - *Hero Card* con indicadores clave consolidados: tipos de proceso, total de procesos asociados y unidades responsables participantes.
   - *Widget de distribución de riesgo*: medidor acumulativo calibrado con los 4 niveles de criticidad del sistema (`Bajo`, `Medio`, `Alto`, `Crítico`).
   - Explorador y filtrado multifacético de procesos por término de búsqueda, tipo de proceso (chips filtrables), unidad responsable y nivel de riesgo.

3. **Ficha de Proceso Homologada (`/procesos/:id`)**:
   - *Hero Card (Grilla 2 columnas)*: rótulo institucional de proceso, código y nombre, línea decorativa dorada (`--ui-color-map-support`), indicador semántico de estado, descripción del proceso y bloque trío de clasificación (`Tipo de proceso`, `Macroproceso` con enlace navegable y `Unidad responsable`).
   - *Widget de Nivel de Riesgo*: medidor tipo *gauge* de 4 ranuras que resalta la clasificación activa con su color semántico y leyenda de criticidad (`Bajo`, `Medio`, `Alto`, `Crítico`).
   - *Propósito del proceso*: tarjeta destacada con acento lateral en `--brand-steel-blue` (`#446BA9`).
   - *Gobernanza del proceso*: contenedor homologado con grilla de 3 tarjetas:
     - **Unidad Responsable**: nombre de la unidad líder, función institucional, indicador de actividad y canales de contacto institucional genéricos.
     - **Responsable del Proceso**: persona o cargo encargado, descripción de gestión operativa, mención del elaborador del proceso y canales de coordinación.
     - **Unidades Participantes**: colección de píldoras/chips de unidades colaboradoras, estado de actividad y función asignada.
   - *Ficha técnica completa*: visualización de todos los campos estandarizados (REQ-06), avisos de completitud de campos mínimos y posibles duplicados.
   - *Gestión interactiva*: operaciones CRUD completas sobre riesgos (descripción, causa, consecuencia, tipo y nivel) y relaciones operativas (`Flujo`, `Dependencia`, `Coordinación`).

4. **Administración y Catálogos (`/procesos`, `/unidades`, `/tipos-de-proceso`)**:
   - Gestión de procesos, altas, edición y parametrización de unidades organizacionales y tipos de procesos.

---

## Reglas de diseño y datos genéricos

- **Datos estrictamente genéricos (`AGENTS.md`)**: El sistema utiliza exclusivamente datos de demostración neutrales e institucionales ("la entidad", "la institución", "la organización"). No contiene referencias a instituciones particulares, facultades reales ni dominios específicos.
- **Sistema de diseño y tokens (`tokens.css`, `base.css`)**:
  - Controles y botones: `--ui-radius-md: 7px`.
  - Contenedores y tarjetas: `--ui-radius-lg: 8px` / `--ui-radius-xl: 12px`.
  - Insignias, estados y píldoras: `--ui-radius-pill: 999px`.
  - Paleta institucional accesible: `--brand-ink` (`#22213F`), `--brand-steel-blue` (`#446BA9`), `--brand-yellow` (`#DEB01F`), `--brand-orange` (`#C9631F`), `--ui-color-danger` (`#A83232`).

---

## Tecnologías

| Componente | Tecnología | Descripción |
|---|---|---|
| **Frontend** | Angular 19 / 22, TypeScript | Standalone components, signals reactivos, control flow (`@if`, `@for`), kit UI accesible. |
| **Backend** | NestJS 11, Node.js 24 | Arquitectura modular, validación estricta de esquemas, API RESTful. |
| **Base de datos** | Oracle Database 19c | Esquema relacional con integridad referencial, secuencias y tipos de datos nativos. |
| **Persistencia** | TypeORM, node-oracledb | Transacciones ACID, pool de conexiones y migraciones de esquema. |
| **Accesibilidad** | WCAG 2.2 AA | Verificación automatizada de 44 pares de color en texto y no-texto. |

---

## Estructura del repositorio

```text
jallupacha/
├── backend/                  # API NestJS, controladores y servicios
│   ├── src/database/         # Migraciones, instalador de esquema y semillas genéricas
│   └── src/mvp-v14/          # Lógica de negocio y endpoints del MVP v14
├── frontend/                 # Aplicación cliente Angular
│   ├── scripts/              # Scripts de verificación de contraste WCAG 2.2 AA
│   └── src/app/
│       ├── shared/ui/        # Kit de componentes UI reutilizables y tokens de diseño
│       ├── mvp-v14-demo.*    # Componente del Mapa de Procesos
│       ├── macroprocess-*    # Componente de Detalle de Macroproceso
│       └── process-detail.*  # Componente de Ficha y Gobernanza de Proceso
├── docs/                     # Especificaciones funcionales, arquitectura y diseño
├── AGENTS.md                 # Principios de desarrollo SDD y regla de datos genéricos
├── package.json              # Configuración y scripts npm de los workspaces
└── README.md
```

---

## Puesta en marcha local

### Requisitos previos
- Node.js 24 LTS y npm 11.
- Instancia activa de Oracle Database 19c (o contenedor Oracle Database Free / EE).
- Variables de entorno configuradas en `backend/.env` (tomando como base `backend/.env.example`).

### Instalación y configuración

1. **Instalar dependencias de los workspaces**:
   ```bash
   npm ci
   ```

2. **Instalar el esquema y datos genéricos del MVP v14 en Oracle**:
   ```bash
   npm run db:install:mvp-v14 --workspace backend
   ```

3. **Iniciar los servidores de desarrollo**:
   - Backend (puerto 3000):
     ```bash
     npm start:dev --workspace backend
     ```
   - Frontend (puerto 4200):
     ```bash
     npm start --workspace frontend
     ```

Direcciones locales por defecto:
- **Frontend**: [http://127.0.0.1:4200](http://127.0.0.1:4200)
- **Backend API**: [http://127.0.0.1:3000/api/mvp-v14](http://127.0.0.1:3000/api/mvp-v14)

---

## Aseguramiento de calidad y pruebas automatizadas

El proyecto cuenta con un conjunto exhaustivo de pruebas unitarias, de integración y auditoría de accesibilidad:

```bash
# 1. Verificación de contraste de diseño (WCAG 2.2 AA - 44 combinaciones)
npm run check:contrast --workspace frontend

# 2. Pruebas de interfaz y navegación Angular
npx ng test --include src/app/mvp-v14-interface.spec.ts --watch=false --workspace frontend

# 3. Pruebas unitarias y de servicios Backend (31 pruebas)
npm test --workspace backend

# 4. Compilación de producción
npm run build
```

---

## Documentación del sistema

- [Instrucciones y principios de desarrollo SDD](AGENTS.md)
- [Especificación funcional vigente del MVP v14](docs/mvp_v14.md)
- [Arquitectura técnica del MVP v14](docs/arquitectura_mvp_v14.md)
- [Adaptación visual y de navegación del mapa](docs/adaptacion_visual_mvp_v14.md)
- [Sistema de diseño digital](docs/design-system.md)

---

## Licencia

Consultar archivo [LICENSE](LICENSE).
