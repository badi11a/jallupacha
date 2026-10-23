# Jallupacha

Sistema web institucional para la gestión, gobierno y administración de procesos, macroprocesos y riesgos institucionales.

---

## Estado actual del proyecto

El producto se rige por la [especificación v15](docs/producto/especificacion_v15.md) y la [arquitectura v15](docs/producto/arquitectura_v15.md), que superan el piloto de operador único C-011. Jallupacha es también el piloto para una guía de experiencia y un sistema de diseño reutilizable. La existencia de código, componentes o pruebas no acredita por sí sola cumplimiento completo de v15, seguridad ni conformidad WCAG 2.2 AA; consultar evidencia y pendientes en [correcciones](docs/trazabilidad/correcciones.md).

Para diseñar y revisar cambios, comenzar por la [guía UX y SDD — STD-UX-001](docs/diseno/marco_estandar_ux_institucional.md): principios explícitos, reglas, navegación alternativa y redundancia, criterios de aceptación, recorridos de revisión y gobierno de patrones. Se aplica como referencia del proyecto; su adopción organizacional permanece pendiente.

### Vistas del frontend (inventario descriptivo, no certificación)

1. **Mapa de Procesos Institucional (`/mapa`)**:
   - Visualización jerárquica por familias (`Estratégicos`, `Misionales`, `De apoyo`) con bandas de color semánticas estables.
   - Filtro integrado mediante control segmentado accesible (patrón *radio group* con tokens de radio de 7 px) y buscador reactivo en tiempo real con normalización sin tildes.
   - Resumen de procesos y tipos por macroproceso y enlaces contextuales a detalle.

2. **Detalle de Macroproceso (`/mapa/macroprocesos/:id`)**:
   - *Hero Card* con indicadores clave consolidados: tipos de proceso, total de procesos asociados y unidades responsables participantes.
   - *Widget de distribución de riesgo*: representación de los niveles `Bajo`, `Medio`, `Alto` y `Crítico`. Su cálculo, alcance y accesibilidad se evalúan conforme a R-12 de la guía; no se confunde con el campo criticidad del proceso.
   - Explorador y filtrado multifacético de procesos por término de búsqueda, tipo de proceso (chips filtrables), unidad responsable y nivel de riesgo.

3. **Ficha de Proceso (`/procesos/:id`)**:
   - *Hero Card (Grilla 2 columnas)*: rótulo institucional de proceso, código y nombre, línea decorativa dorada (`--ui-color-map-support`), indicador semántico de estado, descripción del proceso y bloque trío de clasificación (`Tipo de proceso`, `Macroproceso` con enlace navegable y `Unidad responsable`).
   - *Widget de Nivel de Riesgo*: medidor tipo *gauge* de 4 ranuras; su presencia no acredita una fórmula de agregación aprobada ni conformidad accesible.
   - *Propósito del proceso*: tarjeta destacada con acento lateral en `--brand-steel-blue` (`#446BA9`).
   - *Gobernanza del proceso*: contenedor homologado con grilla de 3 tarjetas:
     - **Unidad Responsable**: identificación de la unidad y estado de actividad. Los contactos y funciones solo son información válida del registro si tienen una fuente definida; los ejemplos visuales no los sustituyen.
     - **Responsable del Proceso**: persona o cargo encargado y mención del elaborador; no atribuir funciones específicas a partir de textos de ayuda genéricos.
     - **Unidades Participantes**: colección de píldoras/chips de unidades colaboradoras, estado de actividad y función asignada.
   - *Ficha técnica completa*: visualización de todos los campos estandarizados (REQ-06), avisos de completitud de campos mínimos y posibles duplicados.
   - *Gestión interactiva*: operaciones CRUD completas sobre riesgos (descripción, causa, consecuencia, tipo y nivel) y relaciones operativas (`Flujo`, `Dependencia`, `Coordinación`).

4. **Administración y Catálogos (`/procesos`, `/unidades`, `/tipos-de-proceso`)**:
   - Gestión de procesos, altas, edición y parametrización de unidades organizacionales y tipos de procesos.

---

## Reglas de diseño y datos genéricos

- **Datos estrictamente genéricos (`AGENTS.md`)**: los datos de prueba y textos deben usar términos neutrales como «la entidad», «la institución» o «la organización», sin referencias a instituciones particulares ni sus denominaciones. Los ejemplos no deben presentarse como atributos reales de un registro.
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
- Instalación directa de Oracle Database 19c, sin Docker, conforme a la arquitectura vigente.
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

El proyecto dispone de verificaciones unitarias, de integración y de contraste. Los resultados y límites se registran por cambio; no equivalen a una auditoría integral de accesibilidad. La revisión documental C-031 no ejecuta estas verificaciones de aplicación:

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

- [Índice general de documentación](docs/README.md)
- [Instrucciones y principios de desarrollo SDD](AGENTS.md)
- [Especificación funcional vigente v15](docs/producto/especificacion_v15.md)
- [Arquitectura técnica vigente v15](docs/producto/arquitectura_v15.md)
- [Guía UX y SDD: principios, reglas, patrones y verificaciones](docs/diseno/marco_estandar_ux_institucional.md)
- [Sistema de diseño digital](docs/diseno/design-system.md)
- [Catálogo de componentes](docs/diseno/catalogo-componentes.md)
- [Patrón compartido de formularios](docs/diseno/patrones-formularios.md)
- [Correcciones y evidencia de revisión](docs/trazabilidad/correcciones.md)
- Los documentos históricos y la referencia visual temporal se retiraron mediante C-040. La documentación vigente está en los enlaces anteriores; los antecedentes versionados se consultan en el historial de Git.

---

## Licencia

Consultar archivo [LICENSE](LICENSE).
