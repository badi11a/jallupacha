# Correcciones verificables

## C-001 — Presentación del entorno como producto

Clasificación: defecto de instrucciones y especificación/diseño. Autoría de la documentación inicial: asistente. El usuario informó presencia repetida de demo y ficticios en la interfaz; la inspección identificó esos textos en acceso, aviso local y administración de perfiles, además de nombres/correos en la semilla.

Origen: las instrucciones enfatizaban condiciones de prueba sin delimitar su presentación. La verificación inicial no cubría adecuadamente textos visibles. No es un cambio del alcance funcional aprobado.

Fuentes: regla de producto cerrado en AGENTS.md; separación entre requisitos y principios de v13; PT-01, PT-02 y PT-03. Los textos exactos propuestos son una corrección de diseño, no una transcripción de un requisito de v13.

Documentos y código corregidos: AGENTS.md (procedimiento reutilizable), docs/especificacion.md (presentación y aceptación), docs/arquitectura.md (frontera técnica y tratamiento de semilla), frontend/src/app/app.component.ts y frontend/src/styles.css (textos visibles), frontend/src/app/app.component.spec.ts (regresiones de interfaz), backend/src/database/seed.ts (nombres/correos semilla) y backend/src/database/migrations/1740000000002-NormalizeSeedIdentityPresentation.ts (normalización condicional de instalaciones existentes).

Implementación: etiquetas de acceso y secciones de administración alineadas con la especificación; un único aviso «Entorno local: acceso de prueba.»; nombres y correos de nuevas identidades semilla normalizados. La migración solo modifica identidades que conservan nombre, correo y marcadores originales de semilla; no sobrescribe campos editados, no cambia perfiles y agrega eventos de auditoría sin valores personales. La semilla no duplica identidades cuyo correo fue editado y falla explícitamente si no puede reconocer una cuenta semilla existente. Se conservan las rutas y controles de autenticación, autorización, sesión, CSRF y auditoría.

Verificación ejecutada:

- `npm run test:frontend`: correcto; 1 archivo y 3 pruebas. Cubren acceso local, etiquetas/nombres visibles, paneles de administrador y vista de consulta; comprueban que no aparezca el encuadre de demo/ficticio/simulado/prototipo y que el aviso local aparezca una sola vez.
- `npm test --workspace backend`: correcto; 4 suites y 9 pruebas.
- `npm run build`: correcto; compilación backend y frontend.
- `git diff --check`: correcto.
- Búsqueda en la interfaz implementada: sin coincidencias de «demo», «ficticio», «simulado», «prototipo» ni «Incremento 1» en las vistas/hojas de estilo revisadas.
- La migración no se ejecutó contra una instancia Oracle en esta verificación; su efecto sobre datos existentes y el recorrido manual conectado a Oracle siguen pendientes de comprobar. La revisión requerida antes de integrar también queda pendiente.

Revisión documental: C-001 v4. Implementación de interfaz y semilla: realizada; evidencia automatizada anterior registrada. Migración Oracle, comprobación del recorrido en instancia y revisión previa a integración: pendientes. No declarar completa la verificación de despliegue.

## C-002 — Error al editar macroprocesos (REQ-02)

Clasificación: defecto de implementación. Fuente: REQ-02 de docs/especificacion.md. Comportamiento esperado: el Administrador edita nombre, descripción y orden; el cambio se refleja inmediatamente y queda auditado. No se cambia el requisito ni su alcance.

Diagnóstico reproducible en Oracle local:

- Esquema configurado: `JALLUPACHA_OWNER`; usuario de runtime: `JALLUPACHA_APP` (cuenta de sesión distinta del propietario).
- El objeto existente `JALLUPACHA_OWNER.MACROPROCESS` era accesible y tenía exactamente SELECT, INSERT y UPDATE para `JALLUPACHA_APP`.
- Faltaba `JALLUPACHA_OWNER.AUDIT` en `ALL_TABLES`; una consulta de lectura y una inserción de prueba con rollback devolvieron `ORA-00942: table or view "JALLUPACHA_OWNER"."AUDIT" does not exist`. El runtime no tenía grants visibles para AUDIT porque el objeto no existía.
- SQL exacto generado por TypeORM para la escritura de auditoría: `INSERT INTO "JALLUPACHA_OWNER"."AUDIT"("ID", "CREATED_AT", "ACTOR_USER_ID", "ACTION", "ENTITY_TYPE", "ENTITY_ID", "BEFORE_VALUE", "AFTER_VALUE") VALUES (DEFAULT, DEFAULT, :1, :2, :3, :4, :5, :6)`.
- El fallo ocurría dentro de `PATCH /api/macroprocesses/:id`: `CatalogService.updateMacroprocess` carga y guarda la fila, luego `AuditService.record` inserta en AUDIT dentro de la misma transacción. ORA-00942 rechaza el PATCH y revierte también la actualización. El cliente no alcanza `reloadCatalogs`; no es un fallo de la recarga posterior.

Corrección propuesta: se añadió `backend/src/database/migrations/1740000000003-CreateMissingAuditTable.ts`, que crea AUDIT con el esquema definido por la migración inicial solo si falta, crea el índice si falta y otorga al usuario de runtime únicamente SELECT e INSERT sobre AUDIT, sin UPDATE/DELETE ni privilegios de esquema. No se editaron migraciones anteriores. Históricamente se ejecutó `up()` directamente; esa ejecución evitó el flujo normal y no registró la migración 0003 en el historial TypeORM. Una consulta inicial buscó el nombre del historial solo en mayúsculas; la inspección posterior confirmó que existe como tabla quoted lower-case `JALLUPACHA_OWNER."migrations"`, con las migraciones 0000–0002 registradas y 0003 pendiente. Luego el comando normal ejecutó y registró 0003; no se insertaron filas manualmente ni se volvió a invocar `up()` directamente.

### Criterios de aceptación y evidencia de reconciliación

1. **Completado antes de cambiar la base:** `DataSource` usa `schema=JALLUPACHA_OWNER`, no configura `migrationsTableName` (TypeORM 0.3.31 usa el nombre predeterminado `migrations`), `migrationsRun=false`, `synchronize=false`, y descubre los cuatro archivos `1740000000000`–`1740000000003`. La tabla de historial tiene columnas `id`, `timestamp`, `name` y registra 0000, 0001 y 0002; 0003 es la única pendiente.
2. **Completado con consultas de solo lectura:** 0000 tiene todas las tablas y columnas declaradas (con las dos diferencias esperadas por 0001), las 62 restricciones están habilitadas y validadas, `ADMIN_CONTROL` contiene solo el ID 1, existe `MACROPROCESS_CODE_SEQ` y están los índices de expiración de sesión y auditoría. Para 0001, los 15 eventos tienen su fila de IP (0 sin asociación) y ya no existe `SECURITY_EVENT.IP_ADDRESS`. Para 0002 hay 5 identidades normalizadas, 0 identidades coincidentes con los valores legacy y 5 eventos `SEED_PRESENTATION_NORMALIZED`. Para 0003 existen todas las columnas de AUDIT, `IX_AUDIT_CREATED` y solo los grants SELECT e INSERT no delegables para `JALLUPACHA_APP`; esos efectos ya estaban presentes por la ejecución histórica directa.
3. **Reconciliación segura completada:** no se modificó el historial manualmente. El comando normal procesó la única migración pendiente, 0003, volvió a comprobar sus efectos idempotentes y la registró; no alteró migraciones anteriores, borró datos ni amplió privilegios.
4. **Completado:** `npm run db:migrate --workspace backend` se ejecutó dos veces y ambas terminaron con código 0. Tras la primera, `JALLUPACHA_OWNER."migrations"` registró `CreateMissingAuditTable1740000000003` además de las otras tres migraciones. Antes y después de la segunda ejecución, `AppDataSource.showMigrations()` devolvió `false`; el historial final contiene las cuatro migraciones. La inicialización TypeORM descubrió las cuatro clases esperadas. Las salidas de consola del script solo muestran el preámbulo de npm; la evidencia de ejecución es el historial Oracle y la consulta TypeORM de pendientes.
5. **PT-05 pendiente:** no hay esquema de pruebas separado disponible. El inventario de esquemas de producto encontró únicamente `JALLUPACHA_OWNER` (13 tablas) y `JALLUPACHA_APP` (sin tablas propias); la cuenta de migración solo tiene CREATE TABLE, no CREATE USER ni CREATE ANY TABLE. No se tocará el esquema runtime ni se aprovisionará otro por fuera del proceso autorizado. La recreación desde cero requiere un esquema aislado que no está disponible en este entorno.

Prueba Oracle añadida: `backend/test/catalog-macroprocess.oracle.e2e-spec.ts` usa el usuario de ejecución; edita el primer macroproceso existente, recarga la fila desde Oracle y comprueba nombre, descripción, orden y el evento `MACROPROCESS_UPDATED` con valores antes/después. Restaura los valores funcionales originales al terminar; conserva los eventos de auditoría, conforme a la regla de no borrar auditoría.

Verificación ejecutada:

- `npm run test:e2e --workspace backend -- --runTestsByPath test/catalog-macroprocess.oracle.e2e-spec.ts`: correcto; 1 suite, 1 prueba respaldada por Oracle.
- Antes de la corrección, probes de lectura e inserción sobre `"JALLUPACHA_OWNER"."AUDIT"` reprodujeron ORA-00942. Después, la prueba editó, recargó y confirmó los datos persistidos y la auditoría.
- Consulta de privilegios posterior: `JALLUPACHA_APP` tiene solo SELECT e INSERT sobre `JALLUPACHA_OWNER.AUDIT`; los grants preexistentes de MACROPROCESS no se ampliaron.
- Se confirmó el historial final TypeORM con las cuatro migraciones y sin pendientes. Sigue pendiente únicamente PT-05: recrear desde cero en un esquema de pruebas separado, no disponible en este entorno.
- `npm test --workspace backend`: 4 suites, 9 pruebas correctas.
- `npm run test:frontend`: 1 archivo, 3 pruebas correctas.
- `npm run build`: backend y frontend correctos.
- `git diff --check`: correcto.

Estado: resuelto.

Verificación:
- Regresión Oracle: edición, recarga y auditoría correctas.
- Verificación manual del responsable: edición de macroproceso
  y consulta de auditoría correctas, 2026-10-08.
- Historial TypeORM reconciliado; sin migraciones pendientes.

Comprobación relacionada diferida:
- PT-05: recreación desde cero en un esquema aislado.
  Pendiente antes de producción.

## C-003 — Fallo de listado tras crear un Borrador (Incremento 2, REQ-05/REQ-06)

Clasificación: defecto de implementación. Fuente y comportamiento esperado: [docs/incremento02_REQ05_REQ06_v1_1228.md](./incremento02_REQ05_REQ06_v1_1228.md), que incluye el listado paginado como entrada a la ficha y el recorrido creación → ficha. No se modifica el alcance ni los límites de paginación.

Diagnóstico y persistencia:

- Angular solicita el listado inicial mediante `GET /api/processes?page=1&limit=20`; el mismo endpoint se usa al completar la creación. Para cargar procesos padre solicita `page=<n>&limit=100`.
- `ListProcessesQueryDto` declara `@Type(() => Number)` y validación entera/rango; el `ValidationPipe` de Nest tiene `transform: true` y no activa conversión implícita. En la prueba HTTP Oracle, el método de listado recibió `page=1` y `limit=20` como números después del pipe.
- El POST reportado sí persistió: la consulta de solo lectura en Oracle encontró el proceso `ID=22`, `CODE=PR5`, estado `Borrador`, activo y con un evento `PROCESS_CREATED` en AUDIT. La prueba posterior confirmó el ciclo completo con un nuevo Borrador.
- El error `Invalid pagination values` se genera en `ProcessService.list` cuando sus argumentos no son enteros seguros o el desplazamiento excede el rango seguro. El flujo HTTP exacto con `page=1&limit=20` pasó incluso antes del ajuste en este checkout; por tanto, el fallo original no se pudo reproducir aquí. No se atribuye sin evidencia a la persistencia ni se afirma haber reproducido otra instancia en ejecución.

Corrección defensiva: `ProcessService.list` normaliza los valores numéricos en su frontera de servicio y aplica explícitamente `page >= 1` y `1 <= limit <= 100` antes de calcular el offset; conserva el límite máximo de la especificación y el DTO mantiene la validación HTTP. No se cambiaron permisos, consultas SQL, migraciones ni datos.

Regresión y evidencia:

- `backend/test/process-list.oracle.e2e-spec.ts` ejecuta POST autenticado → `GET /api/processes?page=1&limit=20` con la misma sesión → `GET /api/processes/:id`. Comprueba en Oracle el Borrador listado y cargado, los parámetros numéricos entregados al servicio y el evento de auditoría; comprueba además que el servicio normalice una consulta numérica sin transformar y rechace `limit=101`.
- `npm run test:e2e --workspace backend -- --runTestsByPath test/process-list.oracle.e2e-spec.ts`: 1 suite y 1 prueba Oracle correctas.
- La misma regresión completa pasó una vez antes y una vez después del ajuste defensivo; no reproduce el error comunicado con la configuración del repositorio actual.
- Revisión registrada: pendiente antes de integrar, conforme PT-03. No se hizo commit ni push.

## C-004 — No se puede editar la descripción de un macroproceso (REQ-02)

Clasificación: defecto de implementación reportado e inspeccionado; fuente: REQ-02 de `docs/especificacion.md`. Comportamiento esperado: el Administrador puede crear, editar y desactivar macroprocesos, incluidos nombre, descripción y orden; el cambio debe verse de inmediato en administración, quedar auditado e incluirse en la siguiente exportación del mapa.

Hallazgo confirmado en la interfaz actual: el diálogo «Editar macroproceso» solicita nombre y orden, pero no ofrece un campo de descripción y envía la descripción previamente cargada sin cambios. Por tanto, la descripción existente no puede modificarse desde ese recorrido. La corrección debe permitir editarla sin retirar validación, autorización de Administrador, auditoría ni recarga de catálogo.

Alcance de esta anotación: registro del defecto para seguimiento SDD; no se corrigió interfaz, API, persistencia ni exportación. La prueba de regresión y la confirmación de la escritura/auditoría Oracle quedan pendientes para la corrección correspondiente.

Verificación manual correcta: listado y proceso PR5 visibles”. La causa original queda como no reproducida y la revisión de código sigue pendiente.

## C-005 — Restablecimiento local sin grants de ejecución: ORA-00942 sobre APP_SESSION (PT-05, PT-14)

Clasificación: defecto de implementación del comando `db:reset:local`; la especificación (grants mínimos, PT-14) no cambia. Comportamiento esperado: tras recrear el esquema desde migraciones, la cuenta de ejecución `JALLUPACHA_APP` accede exactamente a las tablas que necesita la API, sin privilegios adicionales ni acceso a `migrations`.

Diagnóstico con las conexiones reales (propietario `JALLUPACHA_OWNER` y ejecución `JALLUPACHA_APP`): ambas conectan a la misma PDB `FREEPDB1` (servicio `freepdb1`), por lo que no era otra PDB. `APP_SESSION`, `SECURITY_EVENT` y las demás tablas base existían en el propietario: la tabla no estaba ausente. La vista `ALL_TABLES` de la cuenta de ejecución solo mostraba `AUDIT`, `PROCESS`, `PROCESS_RISK`, `PROCESS_VERSION`, `RISK_LEVEL` y `RISK_TYPE`: los grants se perdieron. Causa: el reset elimina las tablas (Oracle elimina sus grants) y las migraciones solo otorgan sobre `AUDIT`, `PROCESS*` y las tablas de riesgo; los grants de las tablas base viven en `backend/database/grant-runtime.sql`, que era un paso manual no invocado. Mi verificación anterior solo contó procesos y riesgos con la cuenta del propietario y no ejercitó la cuenta de ejecución ni las tablas de sesión.

Corrección: nuevo `backend/src/database/grants.ts` y script `db:grant` (propietario, idempotente); lee las líneas `GRANT` de `grant-runtime.sql` como única fuente, solo privilegios de tabla sobre objetos del propietario, y exige `DATABASE_USER` distinto del esquema. `db:reset:local` lo invoca tras las migraciones. No se purgó de nuevo, no se tocaron los 12 procesos/riesgos, no se editaron migraciones ni el historial `migrations`.

Evidencia ejecutada (esquema local, cuenta de ejecución): `npm run db:grant --workspace backend` aplicó 13 grants; la cuenta de ejecución quedó con acceso a las 17 tablas de aplicación (consulta `SELECT … WHERE 1=0` correcta en cada una; `migrations` sigue inaccesible, como corresponde). Con el backend compilado en el puerto 3101: `GET /api/auth/me` sin sesión → 401; inicio de sesión local (identidad 3) → 201; `GET /api/auth/me` → 200; `GET /api/process-map` → 200 con 3 macroprocesos y 12 procesos; ficha → 200; `GET /api/processes/:id/risks?page=1&limit=100` → 200 (1 riesgo); `GET /api/risk-types` y `/api/risk-levels` → 200; cierre de sesión sin CSRF → 403, con CSRF → 204 y la cookie previa deja de autenticar (401). Pruebas: `grants.spec.ts` (2 pruebas) y `release01-map-risks.oracle.e2e-spec.ts` (1 prueba) aprobadas; `npm run build --workspace backend` sin errores.

Pendiente: no se repitió un reset completo con el comando corregido (la purga ya se había usado y no se autorizó otra); la secuencia reset → migraciones → grants queda verificada por partes, no de extremo a extremo. PT-05 sigue verificado solo en el esquema local y PT-14 requiere revisión de configuración antes de producción. La interfaz Angular no se verificó en este cambio.


## C-006 — «Riesgos del proceso» muestra «alguna referencia ya no está disponible» (REQ-10/11)

Clasificación: defecto de implementación del entorno de desarrollo; la especificación no cambia. Comportamiento esperado: ficha → listado de riesgos devuelve 200 con `GET /api/processes/:id/risks?page=1&limit=100` para los perfiles autorizados, y el servidor valida todo dato de entrada (PT-08).

Petición que falla y causa: la vista traduce cualquier 400 de su carga a ese mensaje (`messageFor` en `process-risks.component.ts`), de modo que el texto no describe la causa real. El 400 provenía de `GET /api/processes/:id/risks?page=1&limit=100` con cuerpo `Invalid pagination values`, lanzado por `RiskService.validatePagination`. Reproducción con las cuatro identidades locales sobre los 13 procesos: la instancia del puerto 3000 (arrancada con `tsx watch`, script `start:dev`) devolvió 400 en todos los procesos para Administrador, Responsable, Gestor de riesgos y Responsable/Gestor; el backend compilado con `tsc` devolvió 200 (o 403 esperado). `tsx` (esbuild) no emite `emitDecoratorMetadata`, por lo que el `ValidationPipe` global no conoce el tipo del `@Query()` y ni valida ni convierte: `page` y `limit` llegan como texto y fallan `Number.isSafeInteger`. Prueba de alcance: un inicio de sesión con un campo extra respondió 201 en el servidor `tsx` y 400 (`forbidNonWhitelisted`) en el compilado; es decir, en ese modo de desarrollo los DTO quedaban sin validar. No era un problema de datos.

Referencias de la semilla (consulta de solo lectura en Oracle con el propietario): 13 riesgos; 0 sin proceso, 0 sin tipo, 0 sin nivel; 0 asociados a tipos inactivos; 4 claves foráneas en `PROCESS_RISK`; tipos Operacional, Estratégico, Cumplimiento, Tecnológico y Financiero y niveles Bajo, Medio, Alto y Crítico, todos activos; ningún proceso sin riesgo. No se purgó ni se modificó ningún dato, y la semilla no requirió cambios.

Corrección: `backend/package.json` → `start:dev` compila con `tsc --watch` y ejecuta `node --watch dist/main.js`, igual que el modo compilado, restituyendo la validación de DTO sin tocar límites, permisos ni controles. Regresión: `backend/src/dev-runner.spec.ts` (el script de desarrollo usa `tsc` y no `tsx`).

Evidencia ejecutada: con el nuevo `npm run start:dev --workspace backend` en el puerto 3102, ficha → `GET …/risks?page=1&limit=100` dio 200 para Administrador, Gestor de riesgos y Responsable/Gestor en los 13 procesos; 403 para Responsable en procesos ajenos y para Consulta (sin 400); `risk-types`/`risk-levels` 200 salvo 403 para Consulta; `page=abc` → 400 y el campo extra en el inicio de sesión → 400. `dev-runner.spec.ts`: 1 prueba correcta. No se ejecutaron pruebas de interfaz ni de otras áreas.

Pendiente: la instancia del puerto 3000 sigue ejecutando `tsx` hasta que se reinicie con `npm run start:dev` (no se detuvo porque no se inició en esta tarea); el mensaje genérico de la vista para cualquier 400 es una mejora de interfaz distinta, no modificada. Sin commit ni push.

## C-010 — Gestión del MVP v14 ausente y restricción de «2 tipos de proceso» ajena a los requisitos (REQ-51, 54, 05, 06, 55, 10, 11, 14, 15, 19)

Clasificación: defecto de implementación (la interfaz y la API solo leían el mapa y la ficha) y defecto de contenido de demostración; no cambia el alcance. Comportamiento esperado: `docs/mvp_v14.md` y `docs/arquitectura_mvp_v14.md` («API del piloto», «Interfaz MVP»). REQ-51 no limita el número de tipos de proceso por macroproceso; el límite de dos provenía de un prompt de contenido y no de los requisitos.

Corrección: servicio, validación y controlador `/api/mvp-v14/*` para tipos de proceso, unidades, procesos, riesgos y relaciones; pantallas Angular de Mapa, Procesos (lista, alta, edición y ficha con riesgos y relaciones), Unidades internas y Tipos de proceso; rutas heredadas de administración retiradas del enrutador. La semilla se amplió a 24 procesos (4 por tipo de proceso). Se documentó el prefijo `/api/mvp-v14/` por colisión con rutas heredadas. Decisiones de producto a confirmar: nombre y clasificación obligatorios; mínimos de «ficha completa» según REQ-05.

Verificación ejecutada: `tsc --noEmit` del backend sin errores; `npm test -- mvp-v14` (8 pruebas correctas); `npm run build` del frontend correcto; pruebas manuales por `curl` contra Oracle (búsqueda sin tildes, rechazo de campos no permitidos, riesgo sin nivel o con nivel inválido, autorrelación y relación duplicada, ciclo de unidades, nombre de unidad duplicado, tipo no perteneciente al macroproceso, desactivar tipo con procesos activos, unidad inexistente, unidad participante repetida); recorrido en navegador: crear tipo de proceso, crear proceso y mostrar el error de riesgo sin nivel. No ejecutado: pruebas Oracle opt-in de gestión (no existen aún), pruebas de interfaz (`ng test`; los specs heredados dependen del login), revisión de contraste WCAG, ni DAST.

## C-009 — Plataforma Oracle oficial inconsistente (PT-01, PT-02, PT-03)

Clasificación: defecto de documentación y de plantilla de configuración; no es cambio funcional ni amplía requisitos. Fuentes: decisión de Oracle Database 19c en `docs/especificacion.md`, secciones «Entorno técnico de esta especificación» y persistencia, y PT-01/PT-02. Comportamiento esperado: Oracle Database 19c es la plataforma oficial para desarrollo, pruebas y producción; los parámetros de conexión se proporcionan por ambiente y no se presupone el servicio institucional.

Hallazgo: `AGENTS.md` aún indicaba Oracle AI Database 26ai Free; `docs/arquitectura.md` contenía «Oracle 19i» y describía 26ai Free para instalación y pruebas; `backend/.env.example` presuponía el servicio `freepdb1`. La configuración de `backend/src/common/config.ts` obtiene host, puerto, servicio, esquema y usuarios desde variables de entorno; TypeORM usa `type: 'oracle'`, `serviceName` y `synchronize: false`.

Corrección: se actualizan `AGENTS.md`, `docs/especificacion.md` y `docs/arquitectura.md` para unificar la plataforma 19c y las verificaciones institucionales; `backend/.env.example` deja host y servicio sin valor predeterminado. Se mantienen TypeORM, node-oracledb, las cuentas separadas de ejecución y migraciones, y los grants mínimos. No se modificaron código, dependencias ni migraciones.

Revisión estática de compatibilidad: las migraciones y consultas inspeccionadas usan NUMBER/ VARCHAR2/CLOB, secuencias, columnas IDENTITY, TIMESTAMP WITH TIME ZONE, binds, FOR UPDATE, LISTAGG y paginación OFFSET/FETCH; no se identificó una construcción exclusiva de Oracle 26ai. Las versiones fijadas siguen siendo TypeORM 0.3.31 y node-oracledb 6.9.0. La documentación de TypeORM describe su driver Oracle con node-oracledb; la guía de node-oracledb 6.9 incluye Oracle Database 19c. Referencias: [TypeORM Oracle driver](https://typeorm.io/docs/drivers/oracle/) y [node-oracledb 6.9 installation](https://node-oracledb.readthedocs.io/en/v6.9.0/user_guide/installation.html).

Verificación y pendientes: la búsqueda de las instrucciones, especificación, arquitectura y `.env.example` no encontró referencias a 26ai, 19i ni `freepdb1`. La revisión estática no detectó incompatibilidades conocidas, pero no acredita ejecución en Oracle 19c. No hay instalación o conexión Oracle, `node_modules`, ni ejecutables `node`/`npm` disponibles en este entorno; por tanto, build, pruebas y compatibilidad de ejecución contra 19c quedan pendientes hasta disponer de Oracle 19c. No se declara verificación Oracle ejecutada.

## C-008 — Paneles de catálogos mostrados en todas las rutas (diseño de navegación)

Clasificación: defecto de especificación/diseño. Fuente: sección «Interfaz: navegación por rutas» de `docs/arquitectura.md`, que establecía mantener catálogos y administración en la misma página; REQ-02/REQ-03/REQ-04 no cambian. Se corrige primero el documento; la implementación queda pendiente y no se ha modificado código.

Hallazgo (inspección de `app.component.ts`): los paneles «Estructura / Macroprocesos» y «Clasificación / Tipos de proceso» se renderizan bajo el `router-outlet` en toda ruta autenticada, de modo que aparecen en el mapa, el listado, la ficha y los riesgos, ajenos a esas pantallas. Hoy cualquier perfil lee los catálogos y solo Administrador los modifica (`RequireProfiles` en `catalog.controller.ts`).

Comportamiento esperado: la estructura común contiene marca, cuenta, navegación y el aviso único; «Estructura» y «Clasificación» pertenecen a una pantalla propia (`/administracion/catalogos`) con las mismas funciones y permisos; mapa, listado, ficha y riesgos no los muestran. Documentos actualizados: `docs/arquitectura.md` (tabla y reglas de rutas, verificación) y `AGENTS.md` (revisar contenido común y por ruta al modificar navegación). Los paneles «Perfiles de usuario» y «Auditoría reciente» tienen el mismo problema de ubicación. **Decisión del responsable del producto (2026-10-08):** separar Catálogos, Perfiles y Auditoría en pantallas propias: `/administracion/catalogos`, `/administracion/perfiles` y `/administracion/auditoria`, conservando funciones, API y permisos. La navegación ofrece «Catálogos» a todo perfil, y «Perfiles» y «Auditoría» solo a Administrador; una dirección de administración sin ese perfil muestra el mensaje de autorización existente sin llamar a la API.

**R10, incorporado a C-008** (hallazgo de la revisión PT-03; defecto de implementación): la marca de la barra superior usa `href="/"` y recarga la aplicación completa, perdiendo el estado y omitiendo la protección de cambios sin guardar de la aplicación. Comportamiento esperado: navegar con el router a `/mapa` sin recargar, sujeto a las guardas de ruta.

Verificaciones definidas para la implementación (no ejecutadas):

| # | Comprobación |
| --- | --- |
| V1 | Las rutas de procesos (mapa, macroproceso, listado, ficha, riesgos) no contienen `Estructura`, `Clasificación`, `Perfiles de usuario` ni `Auditoría reciente`, y sí marca, cuenta, navegación y un solo aviso de entorno. |
| V2 | `/administracion/catalogos`, `/administracion/perfiles` y `/administracion/auditoria` muestran solo sus paneles, una vez, con título y foco conforme a C-007; la recarga y el enlace directo funcionan. |
| V3 | Administrador conserva alta, edición y desactivación de macroprocesos y tipos (con validación y auditoría), la asignación de perfiles (sin modificar el propio) y la consulta de auditoría con «Actualizar»; Consulta, Gestor de riesgos y Dueño leen catálogos sin ver acciones. |
| V4 | Sin perfil Administrador, la navegación no ofrece «Perfiles» ni «Auditoría» y sus direcciones muestran el mensaje de autorización sin llamar a la API; llamadas directas a las rutas de escritura y de administración sin ese perfil devuelven 403; sin sesión, 401 (PT-07). |
| V5 | La marca navega a `/mapa` mediante el router: sin recarga y con la protección de cambios sin guardar (R10). |
| V6 | Sin cambios en API, datos, permisos ni alcance; build y pruebas afectadas del frontend pasan. |

Implementación y evidencia: ver «Implementación y evidencia de C-008», al final de este archivo.

## C-007 — Foco y navegación en la interfaz: enlace de salto, cierre de diálogos y cambios de ruta (Release 01, PT-03)

Clasificación: defectos de implementación del frontend detectados en la revisión PT-03 de interfaz del Release 01 (hallazgos R1–R3 en `docs/release01_navegable.md`). No cambian requisitos, API, permisos ni datos. Fuentes: decisiones de diseño técnico «Interfaz: kit de componentes compartidos» y «Interfaz: navegación por rutas» de `docs/arquitectura.md` (WCAG 2.2 AA como referencia de accesibilidad; REQ-32 sigue pendiente de verificación formal).

| # | Defecto | Comportamiento esperado | Verificación |
| --- | --- | --- | --- |
| R1 | «Ir al contenido principal» usa `href="#main-content"`; con `<base href="/">` se resuelve como `/#main-content`, recarga la aplicación y lleva a `/mapa`. | Activarlo con teclado o mouse mueve el foco a `#main-content` sin recargar ni cambiar la ruta, la dirección ni los cambios pendientes. | Prueba de `ui-app-shell` y comprobación con teclado en una ruta profunda. |
| R2 | Al cerrar un diálogo, el foco cae en `body`: el servicio lo devolvía mientras el `<dialog>` modal seguía en el documento. | Tras cerrar (Escape, Cancelar o confirmar sin navegar), el foco vuelve al control que abrió el diálogo, si sigue en el documento. | Prueba del servicio de diálogos y comprobación con teclado en confirmación y formulario. |
| R3 | Al cambiar de ruta o de sesión, el foco queda en `body`, no se anuncia la pantalla, el título del documento no cambia y se conserva el desplazamiento anterior. | Cada pantalla tiene título propio. Al cambiar de ruta (no solo de parámetros), el foco va al encabezado del contenido; una navegación nueva empieza arriba y Atrás/Adelante restaura la posición guardada de esa entrada. La carga inicial no mueve el foco. Al iniciar o cerrar sesión, el foco va al encabezado visible. | Pruebas de títulos, foco y desplazamiento por tipo de navegación; comprobación con teclado y Atrás/Adelante. |

Corrección y evidencia: ver «Implementación y evidencia de C-007», a continuación.

### Implementación y evidencia de C-007

Corrección (solo frontend; sin cambios de backend, datos, API ni permisos):

- **R1:** `ui-app-shell` intercepta el clic (o Enter) en «Ir al contenido principal», enfoca `#main-content` sin navegar y lo desplaza a la vista. El `href` se conserva como semántica del enlace.
- **R2:**
  - `ui-dialog-host` cierra el `<dialog>` nativo (`close()`), terminando el estado modal, antes de entregar el resultado;
  - `UiDialogService.settle` devuelve entonces el foco al control que abrió el diálogo, si sigue en el documento;
  - se descartó devolverlo tras el render, porque dependía del orden de los ciclos de render.
- **R3:** nuevo `provideUiNavigation({ appName })` en el kit (`shared/ui/navigation.ts`), registrado en `main.ts`:
  - `UiTitleStrategy`: título «<pantalla> · Sistema de Procesos Institucionales» según el `title` de cada ruta en `app.routes.ts`;
  - `UiNavigationFocus`: al cambiar de ruta (no solo de parámetros), foco al encabezado del contenido enrutado (`tabindex="-1"`, sin desplazar). Una navegación nueva empieza arriba y Atrás/Adelante restaura la posición guardada de la entrada (con reintentos mientras la pantalla carga). La carga inicial y los cambios de agrupación o página no mueven foco ni desplazamiento. `history.scrollRestoration` pasa a `manual`, porque la restauración nativa competía con la del servicio;
  - `AppComponent`: título «Acceso · …» sin sesión, título de la pantalla al iniciar sesión y foco en el encabezado visible al iniciar y al cerrar sesión.
- Los encabezados enfocados por la navegación no muestran contorno (no son controles operables). El contorno de los controles no cambia.

Regresiones agregadas:

- `shared/ui/ui.spec.ts`:
  - el enlace de salto no cambia la dirección y enfoca `#main-content`;
  - el foco vuelve al control que abrió el diálogo cuando este ya no está abierto (falla con la implementación anterior).
- `shared/ui/navigation.spec.ts` (nuevo, con historial simulado y `canceledNavigationResolution: 'computed'`):
  - títulos;
  - sin cambios en la carga inicial;
  - foco en el encabezado enrutado y no en el saludo común, más subida al inicio;
  - sin cambios ante parámetros;
  - restauración con Atrás y Adelante en dos ciclos.

Evidencia ejecutada (2026-10-08):

- `npx ng test --watch=false` limitado a las regresiones afectadas (`ui.spec.ts`, `navigation.spec.ts`, `app.component.spec.ts`, `process-workspace.component.spec.ts`, `process-risks.component.spec.ts`): 5 archivos y 42 pruebas aprobadas. Tras el último ajuste de `navigation.ts`: `ui.spec.ts` y `navigation.spec.ts`, 2 archivos y 16 pruebas aprobadas.
- `npm run build --workspace frontend`: correcto. `git diff --check`: correcto.
- Comprobación manual en el entorno local, navegador integrado a 360 × 800 px, teclado real, cuentas Gestor de riesgos y Administrador:
  - **R1:** desde `/mapa/macroprocesos/1`, Shift+Tab hasta el enlace y Enter. La página no se recargó (marcador en `window` intacto), la dirección no cambió y el foco quedó en `#main-content`; el siguiente Tab entró al contenido.
  - **R2:** en riesgos, con texto sin registrar, Enter en «Volver a la ficha» abrió el diálogo con foco en «Seguir editando». Escape lo cerró, el foco volvió a «Volver a la ficha» con contorno visible y el texto se conservó. Con Administrador, Escape en «Editar macroproceso» y en la confirmación de «Desactivar» devolvió el foco a «Editar» y a «Desactivar»; no se guardó ni desactivó nada.
  - **R3:**
    - Ingreso con teclado en una dirección profunda: título de la pantalla y foco en su encabezado.
    - Cierre de sesión: título «Acceso · …» y foco en «Administración de procesos».
    - Desde el último proceso de la lista (desplazamiento 758) a su ficha: título «Ficha del proceso · …», desplazamiento 0 y foco en el encabezado.
    - `history.back()`: desplazamiento 758 restaurado y foco en «Estratégicos».
    - Desplazar a 300 y `history.forward()`: ficha en 150, la posición guardada al salir.
    - `history.back()`: 300.
    - «Salir sin guardar» con teclado: ficha arriba, con el foco en su encabezado.
  - Atrás/Adelante se dispararon con `history.back()`/`history.forward()`, que generan el mismo `popstate`: los atajos Alt+Izquierda/Derecha no llegan al panel integrado.

Limitaciones: sin lector de pantalla (no se verificó el anuncio del encabezado enfocado); un solo navegador. Algunas capturas de la comprobación fallaron por el panel del navegador; la evidencia es del DOM y del teclado real. La marca de la barra superior (`href="/"`) sigue navegando con recarga completa: es un hallazgo distinto de R1–R3 y no se modificó. Sin commit ni push.

### Implementación y evidencia de C-008

Corrección (solo frontend; sin cambios de backend, datos, API ni permisos):

- **Estructura común** (`app.component.ts`): acceso, cuenta y cierre de sesión, aviso único, saludo y navegación principal. Ya no contiene catálogos, perfiles ni auditoría, ni carga sus datos al iniciar sesión. La navegación ofrece «Mapa de procesos», «Procesos» y «Catálogos» a todo perfil, y «Perfiles» y «Auditoría» solo con perfil Administrador.
- **Pantallas propias** en `frontend/src/app/administration/` con las funciones, textos, llamadas de API y mensajes previos:
  - `catalogs.component.ts` en `/administracion/catalogos`: «Estructura»/«Macroprocesos» y «Clasificación»/«Tipos de proceso», con alta, edición por diálogo y desactivación con confirmación solo para Administrador; lectura para los demás perfiles.
  - `profiles.component.ts` en `/administracion/perfiles`: asignación por casillas; el propio perfil queda deshabilitado; tras cada cambio se relee la sesión mediante `refreshSession`, como antes.
  - `audit.component.ts` en `/administracion/auditoria`: `GET /api/audit?page=1&limit=50` con «Actualizar».

  Sin perfil Administrador, Perfiles y Auditoría muestran «La acción no está autorizada para este perfil.» sin llamar a la API; un 403 del servidor se presenta igual.
- **Rutas** con título (`app.routes.ts`): «Catálogos», «Perfiles de usuario» y «Auditoría»; foco y desplazamiento según C-007.
- **R10:** `ui-app-shell` navega desde la marca con `routerLink` a la ruta de inicio (`/mapa`), sin recarga y sujeto a las guardas de cambios sin guardar.
- `access.ts` concentra `isAdmin`, los mensajes de administración y `refreshSession` en los datos de sesión del `router-outlet`. Las etiquetas de perfiles pasan a `administration/profiles.ts`.

Pruebas:

- `app.component.spec.ts`, reorganizado:
  - acceso;
  - V1: mapa, macroproceso, listado, ficha y riesgos sin «Estructura», «Clasificación», «Perfiles de usuario» ni «Auditoría reciente», con marca, cuenta, navegación y un aviso;
  - V4: navegación por perfil;
  - R10/V5: la marca apunta a `/mapa`, evita la recarga y el router llega a `/mapa`;
  - cierre de sesión con y sin cambios pendientes.

  Las pruebas de V1 y R10 fallarían con la implementación anterior.
- `administration/administration.spec.ts` (nuevo):
  - V2: cada pantalla muestra solo sus paneles;
  - V3: alta, edición validada y desactivación con cancelación; lectura sin acciones para Consulta; asignación de perfiles con el cuerpo exacto del `PUT` y relectura de sesión; auditoría con «Actualizar»;
  - V4: sin perfil Administrador no se solicitan perfiles ni auditoría, y un 403 del servidor se muestra.

Evidencia ejecutada (2026-10-08):

- `npm run build --workspace frontend`: correcto.
- `npx ng test --watch=false` limitado a las pruebas afectadas (`app.component.spec.ts`, `administration/administration.spec.ts`, `shared/ui/ui.spec.ts`): 3 archivos y 25 pruebas aprobadas.
- `git diff --check`: correcto.

No ejecutado: la comprobación con llamadas directas a la API sin perfil Administrador (V4, parte de servidor) no se repitió porque el backend no cambió; sigue cubierta por las pruebas del backend existentes. No se hizo revisión visual ni con teclado en navegador en este cambio. Las pruebas de mapa, procesos, riesgos y navegación no se ejecutaron porque esos componentes no cambiaron; solo se agregaron rutas a `app.routes.ts`. Sin commit ni push.

## C-009 — Alineación documental con MVP v14

Clasificación: corrección de especificación/diseño. Fuente: `docs/referencias/Requisitos_Sistema_Procesos_v14.xlsx`, aprobada por el responsable del producto.

Hallazgo: `docs/especificacion.md`, `docs/arquitectura.md` y los documentos de release vigentes hasta este cambio se basaban en v13. Sus reglas de macroprocesos editables, perfil Gestor de riesgos, catálogos configurables de riesgos y aprobación administrativa contradicen v14.

Corrección: se declara `docs/mvp_v14.md` como especificación funcional vigente del MVP, con los 26 requisitos Imprescindibles y sus dependencias. `AGENTS.md` identifica v14 como fuente de verdad y exige consultar la nueva especificación. Los documentos v13 se marcan como históricos; no se modifica código, datos ni API en esta corrección.

Verificación: se compararon los 26 requisitos Imprescindibles de la planilla v14 con `docs/mvp_v14.md`; la fuente local v14 existe en `docs/referencias/`. Pendiente: alinear la arquitectura y los contratos técnicos con v14 antes de cualquier implementación.

## C-010 — Postergación de Google Workspace (REQ-25)

Clasificación: cambio de producto aprobado por el responsable. Fuente: instrucción directa del responsable posterior a v14.

Decisión: REQ-25 no forma parte del MVP actual y queda como candidato a eliminación. Se mantiene transcrito en `docs/mvp_v14.md` para conservar trazabilidad con v14, pero está marcado como postergado y no se declara cumplido.

Límite: el acceso local de desarrollo no reemplaza una autenticación de producción. Antes de desplegar para usuarios reales se debe aprobar un mecanismo de identidad alternativo o eliminar la necesidad de acceso autenticado junto con sus requisitos dependientes.

## C-011 — Piloto de operador único sin autenticación ni perfiles

Clasificación: cambio de producto aprobado por el responsable. Fuente: confirmación explícita del responsable.

Decisión: el MVP se limita a un piloto de operador único, sin inicio de sesión, perfiles, autorización ni auditoría por usuario. Se postergan REQ-25, REQ-26, REQ-27, REQ-07, REQ-09 y REQ-56. Debido a sus dependencias, también se postergan REQ-36, REQ-17 y REQ-52. El MVP conserva 17 requisitos Imprescindibles activos.

Límite: el piloto no declara cumplimiento de controles basados en identidad o rol. Cualquier ampliación a varios usuarios, revisión/validación o publicación del mapa requiere una nueva decisión de producto y diseño técnico antes de implementar.

## C-012 — Arquitectura alineada con MVP v14

Clasificación: corrección de diseño previa a implementación. Fuente: `docs/mvp_v14.md`, C-010 y C-011.

Hallazgo: la arquitectura anterior conservaba contratos basados en autenticación, perfiles, elaborador identificado, auditoría por usuario, catálogos editables de macroprocesos y gestión transversal de riesgos. Esos contratos contradicen el piloto de operador único y los 17 requisitos activos.

Corrección: `docs/arquitectura_mvp_v14.md` define el modelo, reglas de dominio, API, interfaz, operación y verificación del MVP. Declara estructura fija, tipos de proceso acotados por macroproceso, unidades jerárquicas, ficha en Borrador, riesgos integrados a la ficha, relaciones dirigidas y búsqueda normalizada. El cambio no modifica código, base de datos, API en ejecución ni migraciones.

Verificación: se contrastaron los 17 requisitos activos de `docs/mvp_v14.md` contra la matriz de trazabilidad de la nueva arquitectura. La siguiente etapa requiere diseñar y verificar la primera migración antes de implementar comportamiento.

## C-013 — Instalación limpia para el modelo v14

Clasificación: corrección de diseño de instalación, pendiente de implementación. Fuente: instrucción del responsable de que una instalación del MVP elimine los datos y estructuras anteriores.

Hallazgo: `backend/src/database/reset-local.ts` destruye de forma protegida un esquema local, pero después ejecuta las seis migraciones y semillas v13. Esto reconstruye autenticación, perfiles, sesiones, auditoría y el modelo anterior, contrario al piloto v14.

Corrección de diseño: la instalación limpia v14 eliminará únicamente objetos de la aplicación dentro del esquema confirmado y aplicará solo un conjunto inicial versionado v14 y sus permisos. Las migraciones v13 no se eliminan todavía: se mantienen como historial, pero se sacarán del camino de instalación v14. La eliminación física o archivo de esos scripts se hará en un cambio separado, después de verificar que ningún ambiente requiere reconstruirse con v13.

Verificación pendiente: prueba Oracle en un esquema de desarrollo desechable que compruebe el borrado acotado, la ausencia de tablas heredadas, las semillas v14, los permisos de runtime y una segunda ejecución reproducible.

## C-014 — Elaboración sin cuenta de usuario en el piloto

Clasificación: corrección de diseño. Fuente: REQ-05 de `docs/mvp_v14.md` y C-011.

Hallazgo: la primera redacción de la arquitectura excluía por completo el elaborador para evitar una cuenta de usuario. REQ-05, aún activo, exige que quien crea el proceso quede registrado como elaborador y que sea independiente del responsable.

Corrección: la ficha v14 incorpora los campos textuales `elaborador` y `responsable`, ambos como persona o cargo y sin referencia a identidad, sesión o perfil. El elaborador es obligatorio para una ficha completa, pero el borrador puede conservarse incompleto. Esto no incorpora auditoría por usuario ni contradice el piloto de operador único.

Verificación pendiente: pruebas de persistencia y API que comprueben la independencia de ambos campos, el borrador incompleto y la validación de ficha completa.

## C-015 — Carga inicial v14 basada en datos existentes

Clasificación: decisión de datos iniciales aprobada por el responsable. Fuente: instrucción de conservar y poder modificar libremente los datos de ejemplo del repositorio.

Decisión: `generic-content.json` es la base autorizada para la demostración del MVP. Sus tres grupos se normalizan como los macroprocesos iniciales Estratégicos, Misionales y de Apoyo, cada uno bajo el tipo de macroproceso homónimo. Sus doce procesos, tipos, descripciones, objetivos y riesgos se conservan como contenido de ejemplo, desvinculados de usuarios, perfiles y auditoría v13.

Verificación pendiente: instalación limpia en Oracle que cargue exactamente esta jerarquía y los doce procesos/riesgos sin crear identidades, perfiles, sesiones ni datos de auditoría.

## C-016 — Integridad de versión y jerarquías en el esquema v14

Clasificación: defecto de diseño de base de datos detectado en revisión técnica.

Hallazgo: el primer DDL v14 permitía que un proceso apuntara como versión actual a la versión de otro proceso y permitía que un proceso fuera padre de sí mismo. La carga de demostración además usaba un texto de elaborador que no identificaba un cargo de demostración.

Corrección: la referencia a versión actual pasa a ser compuesta por proceso y versión; se prohíbe explícitamente un padre igual al propio proceso; la semilla usa el cargo `Elaborador de demostración`. Los ciclos de unidades de varios niveles se validarán en el servidor, pues una restricción declarativa no puede recorrer un árbol Oracle.

Verificación pendiente: pruebas Oracle negativas para versión de otro proceso y padre propio, y pruebas de API para ciclos de unidades y el campo elaborador.

## C-017 — Ejecución comprobada de instalación limpia v14

Clasificación: evidencia de verificación de instalación.

Ejecución: en el esquema local de desarrollo `JALLUPACHA_OWNER`, el comando `npm run db:install:mvp-v14 --workspace backend` se ejecutó con su confirmación destructiva explícita. La conexión de la cuenta propietaria se comprobó antes con una consulta a `DUAL`.

Resultado: la primera ejecución creó el esquema v14 y la carga demostrativa. La segunda ejecución volvió a destruir y recrear los objetos sin error. Tras ella se verificaron por consulta: 3 tipos de macroproceso, 3 macroprocesos, 6 tipos de proceso, 12 procesos, 12 riesgos, 1 unidad de demostración y 12 asociaciones de unidad responsable. El inventario contiene solo las nueve tablas v14 y el registro TypeORM `migrations`; la consulta explícita de `APP_USER` devolvió que esa tabla ya no existe, como se espera del modelo v14.

Prueba Oracle adicional: `backend/test/mvp-v14-install.oracle.e2e-spec.ts` se ejecutó contra el esquema local con opt-in explícito y aprobó sus 7 casos. Comprueba inventario, ausencia de objetos heredados, conteos de semillas y rechazos de nivel de riesgo inválido, autorrelación, segunda unidad responsable, clasificación cruzada y versión actual de otro proceso. Un defecto en el parámetro repetido de la prueba de autorrelación se corrigió antes de la ejecución aprobada.

Límites: aún faltan validación de permisos de runtime, validación de ciclos y pruebas de la API e interfaz v14. Esta evidencia no acredita HTTPS, respaldo/restauración ni la versión exacta del servidor Oracle.

## C-018 — Excepción explícita de cuenta runtime en QA

Clasificación: excepción de operación QA aprobada por el responsable.

Decisión: el ambiente QA vacío usa temporalmente la misma cuenta `PROCESOS` como propietaria de esquema, migración y ejecución del MVP. No se creará una cuenta runtime independiente en esta etapa.

Corrección: la instalación v14 conserva la separación por defecto y solo acepta esa configuración cuando `MVP_V14_ALLOW_OWNER_RUNTIME_FOR_QA=true` se declara explícitamente. En esa excepción omite los `GRANT` al mismo propietario, que Oracle no permite ni necesita.

Límite: esta excepción no se permite implícitamente y no debe trasladarse a producción; antes de producción se debe volver a una cuenta de ejecución con privilegios mínimos.
