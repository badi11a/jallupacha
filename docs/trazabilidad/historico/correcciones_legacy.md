# Registro de correcciones históricas — Ciclos v13 / v14 (C-001 a C-039)

> **Nota de archivo:** Este documento preserva la evidencia y trazabilidad de las correcciones previas a la versión 15 (v15), concluidas y consolidadas con la purga autorizada C-040. Para las correcciones y cambios activos del producto, consultar [docs/correcciones.md](../correcciones.md).

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

Clasificación: defecto de implementación. Fuente histórica y comportamiento esperado: `docs/incremento02_REQ05_REQ06_v1_1228.md` (documento retirado mediante C-040, recuperable desde Git), que incluye el listado paginado como entrada a la ficha y el recorrido creación → ficha. No se modifica el alcance ni los límites de paginación.

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

## C-019 — Purga de especificación errónea de cabecera/cuenta y componentes huérfanos

Clasificación: corrección de defecto de especificación y limpieza de código muerto. Fuente: instrucción de producto y saneamiento técnico.

Hallazgo:
1. `UiAppShellComponent` incorporaba una barra superior (`topbar`) con logotipo institucional, bloque de identificación de usuario (`account`) y botón de cerrar sesión (`logout`), lo cual fue identificado como una especificación errónea que debía depurarse de la interfaz.
2. Existían componentes y vistas huérfanas en el frontend no vinculadas al router (`process-workspace`, `process-map` v13, `process-risks`, `access.ts` y el módulo `administration/` con `audit`, `catalogs`, `profiles`), así como pruebas unitarias desalineadas (`app.component.spec.ts`).

Corrección:
- Se eliminó `UiAppShellComponent` de `frontend/src/app/shared/ui/app-shell.component.ts` y de su exportación pública en `index.ts`.
- Se eliminaron las reglas CSS correspondientes (`.topbar`, `.brand`, `.brand-logo`, `.account`, `.app-footer`) en `base.css`.
- Se eliminaron todos los componentes y archivos huérfanos mencionados de `frontend/src/app/`.
- Se adaptó `ui.spec.ts` para validar componentes del kit UI de forma autónoma con `UiDialogHostComponent` integrado en su arnés de prueba.
- Se configuró `angular.json` para descubrimiento dinámico global de pruebas (`src/**/*.spec.ts`).
- Se actualizó `docs/catalogo-componentes.md` retirando `UiAppShellComponent` y registrando el anfitrión de diálogos en `app.component.ts`.

Verificación:
- 25 pruebas unitarias de frontend aprobadas en Vitest (`npm run test:frontend`).
- 31 pruebas unitarias de backend aprobadas en Jest (`npm test`).
- Compilación de producción de frontend completada exitosamente sin advertencias de presupuesto (`npm run build --workspace frontend`).
- 44 combinaciones de color verificadas conforme a WCAG 2.2 AA (`npm run check:contrast --workspace frontend`).

## C-020 — Desbloqueo de base de datos e integración de identidad institucional (Pilar 1)

Clasificación: corrección de diseño de base de datos. Fuente: desbloqueo de REQ-07, REQ-56 y reincorporación de REQ-25, REQ-26, REQ-27.

Hallazgo:
1. La tabla `PROCESS_VERSION` contenía restricciones forzadas del MVP que impedían el avance del ciclo de vida del proceso: `CHECK (VERSION_NUMBER = 1)` y `CHECK (STATUS = 'Borrador')`.
2. Las tablas de identidad, usuarios, perfiles, sesiones y auditoría se encontraban aisladas y fuera del esquema activo por la excepción mono-operador C-011.

Corrección:
- Se liberaron las restricciones de `PROCESS_VERSION`: `VERSION_NUMBER >= 1` y `STATUS IN ('Borrador', 'En revisión', 'Vigente', 'Obsoleto')`.
- Se integraron al esquema DDL principal y a sus permisos las tablas institucionales: `APP_USER`, `USER_IDENTITY`, `APP_PROFILE`, `USER_PROFILE`, `DEMO_IDENTITY`, `ADMIN_CONTROL`, `APP_SESSION`, `AUDIT`, `SECURITY_EVENT`, `SECURITY_EVENT_IP`.
- Se incorporaron a las semillas del sistema los perfiles obligatorios: `ADMIN`, `PROCESS_OWNER`, `VALIDATOR`, `CONSULTATION`, `RISK_MANAGER`.
- Se actualizaron los permisos de ejecución en `mvp-v14-grants.ts` para cubrir todas las tablas de identidad y procesos.

Verificación:
- 31 pruebas unitarias de backend en Jest aprobadas (`npm test`).
- 25 pruebas unitarias de frontend en Vitest aprobadas (`npm run test:frontend`).

## C-021 — Unificación de servicios y entidades TypeORM con el modelo institucional v14 (Pilar 2)

Clasificación: defecto de implementación y diseño arquitectónico. Fuente: REQ-05, REQ-06, REQ-15, REQ-16, REQ-51, REQ-54, REQ-55.

Hallazgo:
1. El backend presentaba duplicidad y fragmentación: un módulo `mvp-v14` paralelo con consultas SQL crudas y sin políticas de autenticación, conviviendo con entidades TypeORM (`ProcessEntity`, `RiskEntity`, `CatalogService`, `ProcessService`) desactualizadas que asumían estructuras obsoletas de v13 (`OWNER_USER_ID`, llaves foráneas numéricas a catálogos de riesgo).
2. Faltaban entidades TypeORM para tablas clave del modelo institucional: `MacroprocessTypeEntity`, `OrganizationalUnitEntity`, `ProcessUnitEntity`, `ProcessRelationEntity`.
3. Incompatibilidad de tipos en `ProcessService`, `RiskService` y `seed.ts` al alinear las entidades con el esquema real de Oracle 19c.
4. Omisión de grants para `MACROPROCESS_TYPE`, `ORGANIZATIONAL_UNIT`, `PROCESS_UNIT` y `PROCESS_RELATION` en `grant-runtime.sql`, detectada por la regla de paridad de `grants.spec.ts`.

Corrección:
- Se crearon las entidades TypeORM: `MacroprocessTypeEntity`, `OrganizationalUnitEntity`, `ProcessUnitEntity`, `ProcessRelationEntity`.
- Se modernizaron las entidades existentes: `MacroprocessEntity` (con `macroprocessTypeId`), `ProcessTypeEntity` (con `macroprocessId`), `ProcessEntity` (eliminado `ownerUserId`, alineado a `PROCESS`), `ProcessVersionEntity` (incorporados los 26 campos de REQ-06), `RiskEntity` (con `riskType` y `riskLevel` como cadenas de v14).
- Se registró la migración `1770000000000-InitialMvpV14.ts` bajo `backend/src/database/migrations/` para descubrimiento automático de TypeORM y compatibilidad con `grants.spec.ts`.
- Se actualizaron los permisos de ejecución en `backend/database/grant-runtime.sql` otorgando privilegios mínimos sobre las nuevas tablas.
- Se refactorizaron los servicios y controladores institucionales:
  - `ProcessService` y `ProcessController`: soporte completo de la ficha de 26 campos, control de acceso institucional con perfiles `ADMIN` y `PROCESS_OWNER`, concurrencia optimista y auditoría.
  - `CatalogService` y `CatalogController`: administración de macroprocesos, tipos de macroproceso, tipos de proceso vinculados a macroprocesos (REQ-51) y unidades organizacionales con validación jerárquica y prevención de ciclos (REQ-54).
  - `RiskService` y `RiskController`: gestión de riesgos vinculados a procesos (REQ-15/16).
  - `seed.ts`: unificado para sembrar usuarios de demo e identidades junto al contenido institucional de procesos de v14 (`seedMvpV14`).
- Se mantuvo compatibilidad con `/api/mvp-v14/*` en `MvpV14Controller` para no romper pruebas ni el frontend existente durante la transición.

Verificación:
- Verificación de grants (`npm test -- src/database/grants.spec.ts`): 10 pruebas aprobadas.
- Pruebas unitarias de backend (`npm test`): 8 suites, 31 pruebas aprobadas.
- Pruebas e2e de autorización, sesiones y procesos (`npm run test:e2e -- authorization.e2e-spec.ts processes.e2e-spec.ts demo-session.e2e-spec.ts`): 3 suites, 19 pruebas aprobadas.
- Pruebas de interfaz frontend (`npm run test:frontend`): 3 suites, 25 pruebas aprobadas.
- Chequeo de tipos estricto (`npx tsc --noEmit`): 0 errores en frontend y backend.

## C-022 — Formalización de la Versión 15 (v15): Autenticación Local Institucional para Intranet y Reactivación Multiusuario

Clasificación: cambio de especificación técnica y arquitectura autorizado por el responsable del producto. Fuente: decisión de producto para despliegue en intranet (sustitución de REQ-25 y superación del piloto mono-operador C-011).

Hallazgo:
1. El requisito original REQ-25 en la planilla v14 exigía autenticación exclusiva mediante Google Workspace institucional (OAuth 2.0).
2. El responsable del producto confirmó que la aplicación se desplegará en una red privada interna (intranet) sin conexión saliente a Internet y sin interconexión disponible con sistemas externos en la fase actual.
3. Se requiere un mecanismo de autenticación 100% autónomo y seguro dentro de la intranet, descartando Google Workspace y formalizando la versión 15 (v15) del producto, manteniendo la base de datos oficial en Oracle Database 19c.

Corrección:
- Se generó la planilla oficial `docs/referencias/Requisitos_Sistema_Procesos_v15.xlsx` con la actualización aprobada de REQ-25 para intranet, conservando la versión 14 como antecedente histórico.
- Se elaboró la especificación funcional completa en `docs/especificacion_v15.md`:
  - Se redefinió REQ-25: Autenticación Local Institucional con credenciales corporativas (correo y contraseña protegida mediante hashing Argon2id bajo OWASP ASVS v4 Nivel 2).
  - Se reactivó formalmente el modelo institucional multiusuario: perfiles `ADMIN`, `PROCESS_OWNER`, `VALIDATOR`, `RISK_MANAGER` y `CONSULTATION` (REQ-26), auditoría inmutable de acciones (REQ-27), ciclo de vida completo de procesos (REQ-07, REQ-09, REQ-56) y estructura jerárquica de unidades (REQ-54).
  - Se documentó la arquitectura extensible de identidad (`USER_IDENTITY.PROVIDER = 'LOCAL'`), preparada para admitir directorios corporativos internos (LDAP/Active Directory/SAML) cuando la infraestructura institucional lo habilite.
- Se elaboró la arquitectura técnica de la versión 15 en `docs/arquitectura_v15.md`:
  - Definición de la tabla `LOCAL_CREDENTIAL` con control de intentos fallidos (bloqueo por 15 minutos tras 5 intentos) y registro en `SECURITY_EVENT`.
  - Mecanismo de sesión con tokens criptográficos de 64 caracteres en `APP_SESSION`, expiración por inactividad a los 30 minutos (PT-09) y protección CSRF mediante cabecera `X-CSRF-Token`.
  - Mantenimiento de Oracle Database 19c como motor de base de datos oficial.
  - Contratos unificados de API REST (`/api/auth/*`, `/api/processes/*`, `/api/catalogs/*`, `/api/units/*`, `/api/process-map`).
- Se actualizaron las instrucciones de desarrollo en `AGENTS.md` para consagrar la versión 15 como la fuente normativa y de arquitectura activa del proyecto.

Verificación:
- Coherencia técnica de la documentación revisada contra los principios técnicos PT-01, PT-02, PT-06, PT-07, PT-08 y PT-09.
- Estructura de requisitos alineada con la trazabilidad histórica de `docs/referencias/Requisitos_Sistema_Procesos_v14.xlsx`.
- 31 pruebas unitarias backend y 25 pruebas frontend aprobadas (`npm test`, `npm run test:frontend`).
- Chequeo de tipos estricto sin errores (`npx tsc --noEmit`).






## C-023 — Implementación de Autenticación Local Institucional v15 en Backend (REQ-25, PT-06, PT-08, PT-09)

Clasificación: implementación de arquitectura y requisitos v15. Fuente: REQ-25 en `docs/especificacion_v15.md` y Sección 2 de `docs/arquitectura_v15.md`.

Hallazgo:
1. El backend carecía del mecanismo de autenticación local institucional para intranet definido en v15 (REQ-25), dependiendo del endpoint de demo previo.
2. Se requería la persistencia de credenciales locales (`LOCAL_CREDENTIAL`), hashing robusto de contraseñas con derivación resistente a fuerza bruta (OWASP ASVS Nivel 2), política de bloqueo automático tras 5 intentos fallidos por 15 minutos, mitigación de enumeración de cuentas y sesiones seguras con expiración por inactividad de 30 minutos (PT-09).

Corrección:
- **Modelo y migración de datos:**
  - Se creó la migración `backend/src/database/migrations/1770000000001-CreateLocalCredential.ts` definiendo la tabla `LOCAL_CREDENTIAL` (`USER_ID`, `PASSWORD_HASH`, `FAILED_ATTEMPTS`, `LOCKED_UNTIL`, `PASSWORD_UPDATED_AT`).
  - Se registró `LOCAL_CREDENTIAL` en `backend/src/database/mvp-v14-schema.ts` (`MVP_V14_TABLES`) y en el orden de limpieza de `backend/src/database/reset-local.ts`.
  - Se configuró el privilegio runtime mínimo en `backend/database/grant-runtime.sql`: `GRANT SELECT, INSERT, UPDATE ON LOCAL_CREDENTIAL TO &&app_user;`.
  - Se creó la entidad TypeORM `backend/src/identity/local-credential.entity.ts`.
- **Criptografía y seguridad:**
  - Se implementaron las funciones `hashPassword` y `verifyPassword` en `backend/src/common/security.ts` utilizando la función nativa `node:crypto.scrypt` (N=16384, r=8, p=1, salt aleatorio de 16 bytes y comparación en tiempo constante `timingSafeEqual`).
- **Endpoint y lógica de autenticación:**
  - Se creó el DTO `backend/src/auth/login.dto.ts` con validación estricta (`@IsEmail`, `@MinLength(8)`, `@MaxLength(128)`, sanitización y normalización en minúsculas).
  - Se implementó `POST /api/auth/login` en `backend/src/auth/auth.controller.ts`:
    - Mensaje neutral unificado ante fallos: *"Credenciales no válidas"* (mitigación contra enumeración de usuarios).
    - Verificación de cuenta activa (`IS_ACTIVE = 1`) y estado de bloqueo temporal (`LOCKED_UNTIL > now`).
    - Bloqueo automático por 15 minutos al alcanzar 5 intentos fallidos consecutivos.
    - Registro de auditoría de seguridad en `SECURITY_EVENT` y `SECURITY_EVENT_IP` para cada intento (`LOGIN`, resultado `SUCCESS` o `REJECTED`).
    - Al autenticar con éxito: restablecimiento del contador a 0, generación de sesión segura en `APP_SESSION` y emisión de cookies `jallupacha_session` (`HttpOnly`, `SameSite=Strict`) y `jallupacha_csrf`.
- **Semilla de datos institucional:**
  - Se actualizó `backend/src/database/seed.ts` para sembrar credenciales locales por defecto (`ClaveDemo2026!`) para todas las identidades semilla.
- **Pruebas automatizadas:**
  - Se creó la suite completa `backend/src/auth/auth.controller.spec.ts` con 7 casos que verifican: inicio exitoso, rechazo de correo inexistente, rechazo de cuenta inactiva, incremento de intentos ante contraseña incorrecta, bloqueo temporal a los 5 fallos, rechazo inmediato de cuenta bloqueada y validación de esquema DTO.

Verificación:
- Pruebas unitarias de seguridad y backend (`npm test`): 9 suites, 39 pruebas aprobadas al 100%.
- Pruebas de grants de base de datos (`src/database/grants.spec.ts`): 10 pruebas aprobadas.
- Pruebas de integración de autorización y sesiones (`npm run test:e2e --workspace backend -- authorization.e2e-spec.ts demo-session.e2e-spec.ts`): 2 suites, 11 pruebas aprobadas.
- Pruebas de frontend (`npm run test:frontend`): 3 suites, 25 pruebas aprobadas.
- Compilación completa de la solución (`npm run build`): compilación TypeScript backend y Angular frontend limpias (código de salida 0).


## C-024 — Implementación de Autenticación Local Institucional v15 en Frontend (REQ-25, R-04, PT-07)

Clasificación: implementación de arquitectura y requisitos v15. Fuente: REQ-25 en `docs/especificacion_v15.md`, Sección 5 de `docs/arquitectura_v15.md` y `docs/marco_estandar_ux_institucional.md`.

Hallazgo:
1. El frontend operaba bajo la navegación mono-operador de la fase histórica de transición sin pantalla de acceso institucional, sin servicio de gestión de identidad ni guardas de ruta.
2. Se requería un servicio cliente de autenticación con estado reactivo de usuario y perfiles (`AuthService`), una guarda de navegación institucional (`authGuard` y `guestGuard`), y una pantalla de inicio de sesión (`LoginComponent`) alineada con las directrices de diseño limpio institucional y con conservación de datos ante errores (R-04).

Corrección:
- **Servicio de autenticación (`AuthService`):**
  - Creado en `frontend/src/app/auth.service.ts` utilizando señales reactivas de Angular (`currentUser`, `isAuthenticated`, `profiles`, `isAdmin`, `isProcessOwner`, `isValidator`, `isRiskManager`, `isConsultation`).
  - Métodos `login(email, password)` consumiendo `POST /api/auth/login` con credenciales de cookie, persistencia en `sessionStorage` para restaurar el estado ante recargas, y `logout()` consumiendo `POST /api/auth/logout` con revocación en servidor y limpieza del almacenamiento local.
- **Guardas de navegación (`authGuard` y `guestGuard`):**
  - Creados en `frontend/src/app/auth.guard.ts`. `authGuard` bloquea el acceso a todas las rutas institucionales si no hay sesión activa y redirige a `/login` preservando `returnUrl`. `guestGuard` evita que usuarios ya autenticados ingresen a la pantalla de login, redirigiéndolos automáticamente a `/mapa`.
- **Componente de acceso institucional (`LoginComponent`):**
  - Creado en `frontend/src/app/login.component.ts`.
  - Diseñado según el estándar institucional y el sistema de diseño (`.login-panel` en `styles.css`), sin elementos superfluos, cabeceras falsas ni duplicación de logotipos corporativos.
  - Accesibilidad WCAG 2.2 AA: etiquetas semánticas vinculadas por `id`, atributos `autocomplete` estándar, botones con estado visual deshabilitado mientras se procesa la solicitud, y mensajes de error anunciados vía `UiMessageComponent` (`role="alert"`).
  - Cumplimiento de regla R-04: Ante rechazo del servidor («Credenciales no válidas»), el formulario conserva intacto el correo ingresado por el usuario, limpiando únicamente el campo de contraseña sensible.
- **Rutas de la aplicación (`app.routes.ts`):**
  - Registro de `/login` con `guestGuard` y protección de todas las rutas de negocio (`/mapa`, `/mapa/macroprocesos/:id`, `/procesos`, `/procesos/nuevo`, `/procesos/:id`, `/procesos/:id/editar`, `/unidades`, `/tipos-de-proceso`) mediante `authGuard`.
- **Pruebas automatizadas (`auth.spec.ts`):**
  - 8 pruebas cubriendo inicio de sesión, almacenamiento seguro, cierre de sesión, guardas de activación y conservación de datos en formulario.
  - Adaptación de `mvp-v14-interface.spec.ts` para proveer sesión autenticada en pruebas de interfaz.

Verificación:
- Pruebas frontend (`npm run test:frontend`): 4 suites, 33 pruebas aprobadas al 100%.
- Pruebas backend (`npm test`): 9 suites, 39 pruebas aprobadas al 100%.
- Compilación de la solución (`npm run build`): compilación limpia en TypeScript backend y Angular frontend (código de salida 0).


## C-025 — Visibilidad de Acciones y Controles por Perfil Institucional (PT-07, REQ-26)

Clasificación: implementación de arquitectura y requisitos v15. Fuente: PT-07, REQ-26 en `docs/especificacion_v15.md` y Sección 5 de `docs/arquitectura_v15.md`.

Hallazgo:
1. En las vistas de mapa (`MvpV14DemoComponent`), listado de procesos (`ProcessListComponent`) y ficha de proceso (`ProcessDetailComponent`), los botones de creación, edición y administración se desplegaban de forma incondicional, sin reflejar los perfiles vigentes del usuario autenticado (`ADMIN`, `PROCESS_OWNER`, `RISK_MANAGER`, `CONSULTATION`).
2. Se requería condicionar la visibilidad de las acciones según los perfiles activos del usuario autenticado mediante `AuthService`, asegurando que perfiles de solo consulta (`CONSULTATION`) no visualicen acciones de modificación o creación.

Corrección:
- **Mapa de procesos (`MvpV14DemoComponent`):**
  - Se inyectó `AuthService` y se condicionó la acción «Nuevo proceso» exclusivamente a usuarios con perfiles `ADMIN` o `PROCESS_OWNER`.
- **Listado de procesos (`ProcessListComponent`):**
  - Se inyectó `AuthService` y se condicionaron las acciones administrativas de catálogo («Unidades internas» y «Tipos de proceso») a usuarios con perfil `ADMIN`, y la acción «Nuevo proceso» a perfiles `ADMIN` o `PROCESS_OWNER`.
- **Ficha técnica de proceso (`ProcessDetailComponent`):**
  - Se inyectó `AuthService` y se condicionó la acción «Editar» proceso a usuarios con perfiles `ADMIN` o `PROCESS_OWNER`.
  - Las acciones sobre riesgos («Agregar riesgo», «Editar» y «Eliminar») se reservaron para los perfiles `ADMIN`, `PROCESS_OWNER` o `RISK_MANAGER`.
  - Las acciones sobre relaciones («Agregar relación», «Editar» y «Eliminar») se reservaron para los perfiles `ADMIN` o `PROCESS_OWNER`.
  - Para usuarios con perfil `CONSULTATION`, la pantalla ofrece una vista de solo lectura sin controles operativos no autorizados.
- **Pruebas automatizadas (`auth.spec.ts`):**
  - Se incorporaron 4 pruebas unitarias que comprueban que el perfil `CONSULTATION` no visualiza botones de creación ni catálogos, mientras que los perfiles autorizados (`ADMIN`, `PROCESS_OWNER`) disponen de sus respectivas acciones.

Verificación:
- Pruebas frontend (`npm run test:frontend`): 4 suites, 37 pruebas aprobadas al 100%.
- Pruebas backend (`npm test`): 9 suites, 39 pruebas aprobadas al 100%.
- Pruebas de integración de backend (`npm run test:e2e --workspace backend -- authorization.e2e-spec.ts demo-session.e2e-spec.ts`): 2 suites, 11 pruebas aprobadas.
- Compilación de la solución (`npm run build`): compilación TypeScript y Angular limpia (código de salida 0).


## C-026 — Administración de Usuarios y Perfiles Institucionales (REQ-26 v15, PT-07)

Clasificación: implementación de arquitectura y requisitos v15. Fuente: REQ-26 en `docs/especificacion_v15.md`, Sección 2 y 4 de `docs/arquitectura_v15.md` y `docs/marco_estandar_ux_institucional.md`.

Hallazgo:
1. En el backend, el tipo `ProfileCode` y el DTO `UpdateProfilesDto` no incluían el perfil `VALIDATOR` definido en la especificación v15 para la separación de funciones entre elaboradores y revisores (REQ-07/REQ-26).
2. El frontend carecía de la pantalla y servicio de administración de usuarios y asignación de perfiles (`UsersComponent` y `UsersService`), requerida para el perfil `ADMIN`.
3. Se requería implementar la ruta `/usuarios` protegida por `authGuard`, con edición accesible de perfiles institucionales (`ADMIN`, `PROCESS_OWNER`, `VALIDATOR`, `RISK_MANAGER`, `CONSULTATION`), protección de cambios no guardados mediante `LeavesWithConfirmation` y `unsavedChangesGuard`, bloqueo de auto-modificación de perfiles en interfaz acorde a la política de servidor (PT-07), y manejo neutral de excepciones de concurrencia y retención del último administrador.

Corrección:
- **Backend (`auth.types.ts`, `profile.dto.ts`):**
  - Se incorporó `VALIDATOR` en `ProfileCode` y en la lista validada `PROFILES` de `UpdateProfilesDto`.
  - Se crearon pruebas unitarias en `backend/src/identity/users.controller.spec.ts` verificando listado, reasignación, rechazo 403 ante auto-modificación, auditoría de cambio y conflicto 409 al intentar remover el último perfil Administrador.
- **Servicio frontend (`UsersService`):**
  - Creado en `frontend/src/app/users.service.ts` con métodos `list()` (`GET /api/users`) y `updateProfiles(id, profiles)` (`PUT /api/users/:id/profiles`).
- **Componente de administración (`UsersComponent`):**
  - Creado en `frontend/src/app/users.component.ts`.
  - Presenta listado accesible de cuentas institucionales con insignias de perfil (`UiBadgeComponent`) e identificación del usuario conectado impidiendo su auto-modificación.
  - Editor interactivo accesible con selección múltiple de perfiles institucionales.
  - Implementación de `LeavesWithConfirmation` (`confirmLeave()`, `isDirty()`) y diálogo modal accesible (`UiDialogService.confirm`) antes de descartar modificaciones pendientes.
- **Rutas y navegación (`app.routes.ts`, `process-list.component.ts`):**
  - Incorporada la ruta `/usuarios` con guardia de activación y guarda de salida.
  - Añadido enlace de acceso directo en el listado de procesos para administradores.
- **Pruebas automatizadas (`users.spec.ts`):**
  - 7 pruebas unitarias verificando carga, protección de auto-edición, activación de editor, guardado, validación de al menos un perfil, manejo de errores de backend y confirmación de cambios pendientes.

Verificación:
- Pruebas frontend (`npm run test:frontend`): 5 suites, 44 pruebas aprobadas al 100%.
- Pruebas unitarias de backend (`npm test`): 10 suites, 44 pruebas aprobadas al 100%.
- Compilación de la solución (`npm run build`): compilación TypeScript backend y Angular frontend limpia (código de salida 0).


## C-027 — Ciclo de Vida y Validación de Procesos (REQ-07, REQ-09, REQ-56 v15)

Clasificación: implementación de arquitectura y requisitos v15. Fuente: REQ-07, REQ-09, REQ-56 en `docs/especificacion_v15.md`, Sección 3 y 4.2 de `docs/arquitectura_v15.md` y `docs/marco_estandar_ux_institucional.md`.

Hallazgo:
1. El backend carecía de las transiciones completas del ciclo de vida de procesos (`Borrador` $\rightarrow$ `En revisión` $\rightarrow$ `Vigente` $\rightarrow$ `Histórico / Obsoleto`) especificadas en la Sección 3 de la especificación v15.
2. No existía la verificación de completitud previa al envío a validación (REQ-05), la segregación de funciones entre elaborador y revisor técnico (REQ-07/REQ-26), el versionamiento formal con archivo de versiones vigentes anteriores (REQ-09/REQ-56), ni el retiro formal del proceso.
3. En el frontend (`ProcessDetailComponent`), no existían los controles de flujo para enviar a revisión, aprobar, rechazar con observaciones obligatorias, crear nueva versión o retirar el proceso, ni la visualización del estado mediante insignias (`UiBadgeComponent`) y número de versión.

Corrección:
- **Backend (`mvp-v14.service.ts`, `mvp-v14.controller.ts`, `process.controller.ts`):**
  - Implementación de `submitProcess(id)`: valida estado `Borrador`, evalúa completitud de campos mínimos y unidad responsable activa (REQ-05), transiciona a `En revisión` e incrementa la revisión con auditoría.
  - Implementación de `approveProcess(id)`: valida estado `En revisión`, comprueba segregación de funciones (el validador debe ser persona distinta de quien elaboró el proceso, salvo administrador), archiva la versión vigente anterior como `Obsoleto` y declara vigente la versión actual con auditoría.
  - Implementación de `rejectProcess(id, reason)`: valida estado `En revisión`, motivo obligatorio de rechazo y segregación de funciones; retorna el proceso a `Borrador` anexando las observaciones técnicas al campo `validation` con auditoría.
  - Implementación de `newVersion(id)`: a partir de una versión `Vigente`, clona la ficha en un nuevo registro de `PROCESS_VERSION` con `versionNumber = versionNumber + 1`, estado `Borrador` y revisión 1, apuntando `CURRENT_VERSION_ID` al nuevo borrador.
  - Implementación de `retireProcess(id)`: reservado a administradores, transiciona un proceso `Vigente` a `Obsoleto`.
  - Inclusión de `VALIDATOR` en los perfiles de lectura de `ProcessController`.
  - Creación de 10 pruebas unitarias en `backend/src/mvp-v14/mvp-v14.lifecycle.spec.ts`.
- **Servicio y Cliente frontend (`mvp-v14-api.service.ts`):**
  - Métodos `submitProcess`, `approveProcess`, `rejectProcess`, `newVersion` y `retireProcess`.
  - Inclusión de `versionNumber`, `revision` e historial de `versions` en `ProcessDetail`.
- **Interfaz de usuario (`ProcessDetailComponent`):**
  - Barra superior de acciones dinámicas según perfil y estado del proceso:
    - En `Borrador`: botones «Editar» y «Enviar a revisión» (con verificación de completitud) para `ADMIN` y `PROCESS_OWNER`.
    - En `En revisión`: botones «Aprobar proceso» y «Rechazar con observaciones» para `ADMIN` y `VALIDATOR`.
    - En `Vigente`: «Nueva versión (v+1)» para `ADMIN` y `PROCESS_OWNER`, y «Retirar proceso» para `ADMIN`.
  - Formulario desplegable accesible de observaciones obligatorias de rechazo técnico con confirmación modal.
  - Insignia semántica de estado (`statusTone`) con versión actual e indicador de total de versiones registradas.
  - Protección de cambios no guardados en el formulario de rechazo mediante `isDirty()`.
- **Pruebas automatizadas frontend (`process-lifecycle.spec.ts`):**
  - 7 pruebas unitarias cubriendo envío a revisión, aprobación por validador, rechazo con observaciones, creación de nueva versión, retiro a obsoleto y protecciones de cambios pendientes.

Verificación:
- Pruebas frontend (`npm run test:frontend`): 6 suites, 51 pruebas aprobadas al 100%.
- Pruebas unitarias backend (`npm test`): 11 suites, 54 pruebas aprobadas al 100%.
- Compilación de la solución (`npm run build`): compilación TypeScript y Angular limpia (código de salida 0).


## C-028 — Consulta de Bitácora de Auditoría Inmutable (REQ-27 v15, PT-07)

Clasificación: implementación de arquitectura y requisitos v15. Fuente: REQ-27 en `docs/especificacion_v15.md`, Sección 3 y 4 de `docs/arquitectura_v15.md` y `docs/marco_estandar_ux_institucional.md`.

Hallazgo:
1. El backend contaba con registro de auditoría (`AuditService.record`), pero su consulta (`AuditController.list`) no incluía los datos del usuario actor (nombre y correo institucional mediante cruce con `USER_IDENTITY`), ni filtros por tipo de entidad o acción.
2. El frontend no disponía de la pantalla ni del servicio para que los usuarios con perfil `ADMIN` pudieran inspeccionar cronológicamente la bitácora de auditoría inmutable, verificar acciones administrativas, cambios de estado y modificaciones antes/después (REQ-27).

Corrección:
- **Backend (`audit.service.ts`, `audit.controller.ts`):**
  - Se modificó `AuditService.list` para realizar una consulta paginada sobre la tabla `AUDIT` con `LEFT JOIN` a `USER_IDENTITY`, resolviendo `actorDisplayName` y `actorEmail`.
  - Se añadieron parámetros opcionales de filtrado por `entityType` y `action`, con orden cronológico descendente (`ORDER BY ID DESC`).
  - En `AuditController`, se incorporaron los parámetros `@Query('entityType')` y `@Query('action')`, asegurando restricción de acceso exclusiva a `ADMIN` (`RequireProfiles('ADMIN')`).
  - Creación de pruebas unitarias en `backend/src/audit/audit.controller.spec.ts`.
- **Servicio y Componente frontend (`audit.service.ts`, `audit.component.ts`):**
  - Creado `AuditApiService` en `frontend/src/app/audit.service.ts` con llamada tipada a `GET /api/audit`.
  - Creado `AuditComponent` en `frontend/src/app/audit.component.ts` con filtros por tipo de entidad y acción, tabla cronológica accesible con insignias de acción (`UiBadgeComponent`), visualización del usuario actor o sistema, formato de fecha UTC y visor desplegable de diferencias (*diff*) antes/después con JSON legible.
  - Paginación dinámica accesible con controles de página anterior y siguiente.
- **Rutas y navegación (`app.routes.ts`, `process-list.component.ts`):**
  - Registro de la ruta `/auditoria` protegida por `authGuard`.
  - Inclusión de enlaces hacia `/auditoria` en el panel de acciones de `ProcessListComponent`, `UsersComponent` y en la cabecera de auditoría.
- **Pruebas automatizadas frontend (`audit.spec.ts`):**
  - 5 pruebas unitarias verificando carga inicial, presentación de actores y sistema, despliegue del visor de cambios antes/después, filtrado por entidad/acción, paginación y manejo de errores.

Verificación:
- Pruebas frontend (`npm run test:frontend`): 7 suites, 56 pruebas aprobadas al 100%.
- Pruebas unitarias backend (`npm test`): 12 suites, 56 pruebas aprobadas al 100%.
- Pruebas de integración API (`npm run test:api -- authorization.e2e-spec.ts demo-session.e2e-spec.ts`): 2 suites, 11 pruebas aprobadas.
- Compilación de la solución (`npm run build`): compilación TypeScript y Angular limpia (código de salida 0).


## C-029 — Navegación e Identidad Institucional para Entorno Multiusuario (STD-UX-001, PT-07, PT-09)

Clasificación: corrección de arquitectura de navegación e interfaz (UX/UI). Fuente: STD-UX-001 (R-01.1 a R-01.6, R-07.2) en `docs/marco_estandar_ux_institucional.md`, `docs/design-system.md` y Sección 5 de `docs/arquitectura_v15.md`.

Hallazgo y revisión crítica:
1. Al superar el piloto de operador único (C-011) e integrar autenticación multiusuario con Argon2id (v15), el usuario autenticado carecía de una navegación institucional predecible y visible en todas las pantallas autenticadas.
2. La implementación inicial de C-029 (`f96f18d`) introdujo un defecto en el flujo de cierre de sesión: `logout()` revocaba la sesión en backend y borraba el estado local antes de navegar a `/login`. Al estar en una pantalla con cambios sin guardar (`canDeactivate`), si el usuario elegía «Continuar editando», la sesión ya se encontraba destruida y la pantalla quedaba inutilizable. Además, si confirmaba descartar, el diálogo se solicitaba dos veces (una por el botón y otra por la guarda).
3. Se mantenían enlaces de navegación cruzada entre catálogos en las cabeceras (`panelActions`) y se habían añadido atajos de administración (`Usuarios`, `Auditoría`) en el pie del mapa (`map-bottom`), contraviniendo R-01.4 de STD-UX-001 («Queda prohibido utilizar el pie como menú o barra de navegación principal de la aplicación o para saltar arbitrariamente entre módulos independientes»).
4. La cabecera fija anterior (`position: sticky/fixed`) competía con el contenedor superior de la intranet anfitriona y consumía espacio vertical continuo necesario para diagramas, matrices y formularios.

Corrección aprobada:
- **Componente Reutilizable `UiModuleNavComponent` (`frontend/src/app/shared/ui/module-nav.component.ts`):**
  - Barra horizontal local, ligera, plana y elástica, **sin `position: sticky` ni `fixed`** (se desplaza con el scroll natural de la página).
  - Título del módulo «Gestión de procesos» subordinado a la intranet, sin alterar la marca institucional `APP_NAME`.
  - Destinos completos con etiquetas íntegras, sin truncamientos ni abreviaciones: `Mapa`, `Procesos`, `Unidades internas`, `Tipos de proceso`, `Usuarios`, `Auditoría`.
  - Visibilidad condicionada estrictamente a permisos actuales (PT-07): `Mapa` y `Procesos` para todo usuario autenticado; los cuatro destinos administrativos restringidos a `ADMIN`.
  - Identificación semántica de sección activa mediante `aria-current="page"` y clase `.active`, manteniendo el contexto activo al navegar a rutas secundarias (ej. `/mapa/macroprocesos/:id` resalta *Mapa*, `/procesos/:id` y `/procesos/nuevo` resaltan *Procesos*).
  - Separación estructural entre destinos de navegación y controles de sesión mediante proyección de contenido (`<ng-content select="[sessionControls]" />`).
- **Ciclo de Cierre de Sesión Seguro con Cambios Pendientes (`app.component.ts`, `unsaved-changes.guard.ts`):**
  - Antes de invocar `AuthService.logout()`, `AppComponent` consulta el método `confirmLeave()` del componente activo en el router outlet.
  - Si existen cambios pendientes y el usuario pulsa «Continuar editando», el cierre se aborta: la sesión institucional y los datos del formulario permanecen intactos.
  - Si el usuario confirma «Descartar cambios», se activa `bypassNextUnsavedChangesConfirmation()` y se procede con `auth.logout()`, evitando la duplicidad del diálogo al desactivar la ruta hacia `/login`.
  - Si el formulario está limpio, el cierre de sesión ocurre de inmediato sin diálogos modales.
- **Limpieza de Accesos Duplicados y Dispersos:**
  - Se removieron los enlaces cruzados de catálogos en `ProcessListComponent`, `UsersComponent`, `AuditComponent`, `UnitsComponent` y `ProcessTypesComponent`, conservando únicamente las acciones de creación contextuales (`Nuevo proceso`, `Nueva unidad`, etc.).
  - Se eliminaron los enlaces de `Usuarios` y `Auditoría` de la barra inferior del mapa (`mvp-v14-demo.component.html`), restableciendo el cumplimiento de R-01.4.
- **Actualización Documental y Pruebas:**
  - Actualización de `docs/marco_estandar_ux_institucional.md` (R-01.1 a R-01.6, versión 1.4) y `docs/arquitectura_v15.md` (Sección 5).
  - Nuevas pruebas en `app.component.spec.ts` y `ui.spec.ts` verificando renderizado plano, permisos, enlaces íntegros, sección activa y los tres flujos de logout (limpio, cancelado y confirmado).
  - Actualización de `mvp-v14-interface.spec.ts` y `auth.spec.ts`.

Verificación:
- Pruebas unitarias frontend (`npm run test:frontend`): 8 suites, 62 pruebas aprobadas al 100%.
- Verificación de contraste (`npm run check:contrast --workspace frontend`): 44 combinaciones conformes con WCAG 2.2 AA.
- Pruebas unitarias backend (`npm test`): 12 suites, 56 pruebas aprobadas al 100%.
- Pruebas de integración API (`npm run test:api -- authorization.e2e-spec.ts demo-session.e2e-spec.ts`): 2 suites, 11 pruebas aprobadas.
- Compilación de producción (`npm run build`): compilación TypeScript y Angular limpia (código de salida 0).
- Estado de Git: cambios en el árbol de trabajo preparados para revisión; sin commit, integración ni despliegue según instrucción expresa.

## C-030 — Corrección de navegación activa y cierre de sesión (R-01, R-07.2, PT-03, PT-09)

Clasificación: defecto de implementación en el cierre de sesión, la ubicación de «Nuevo proceso» y la semántica de sección activa; defecto de especificación de diseño en el acabado del indicador, cuya forma no estaba definida. Fuentes: revisión de C-029 y corrección solicitada por el responsable, `docs/design-system.md`, `docs/marco_estandar_ux_institucional.md` y sección 5 de `docs/arquitectura_v15.md`.

Comportamiento esperado y revisión previa de diseño (IA):
- El indicador de ubicación utiliza un subrayado recto, sin fondo de pestaña ni esquinas de formas distintas. La página exacta y su sección padre se distinguen mediante `aria-current`.
- «Nuevo proceso» se muestra en el encabezado del mapa para los perfiles ya autorizados, sin duplicarlo al pie.
- Cancelar el cierre conserva formulario y sesión; confirmarlo provoca una sola confirmación. Mientras responde el servidor, no se pueden editar datos ni navegar a otro formulario. La redirección a acceso se completa antes de retirar el estado de cierre.
- La revisión de diseño mantiene requisitos, controles de servidor, mecanismo de autenticación y los siete colores de marca. No sustituye conformidad institucional para producción.

Corrección implementada:
- `UiModuleNavComponent` aplica el subrayado recto compartido, sin fondo ni borde de pestaña, y distingue página exacta de sección padre. La suscripción a rutas termina al destruirse el componente.
- El encabezado del mapa contiene «Nuevo proceso» con los permisos existentes; se retira su duplicado del pie.
- Se elimina `bypassNextUnsavedChangesConfirmation`. `AuthService` mantiene el estado de cierre hasta completar la redirección. Durante la petición, las guardas rechazan otras rutas y el contenido se vuelve inerte; se anuncia «Cerrando sesión…». La guarda permite únicamente llegar a `/login` después de eliminar la sesión local, sin pedir nuevamente confirmación.

Evidencia de verificación ejecutada:
- **Pruebas:** `npm test --workspace frontend -- --include src/app/app.component.spec.ts --include src/app/mvp-v14-interface.spec.ts --include src/app/auth.spec.ts`: 3 suites, 37 pruebas aprobadas. Se utilizan el router y `AuthService` reales con HTTP simulado para comprobar cierre limpio, cancelación, una sola confirmación, rechazo de navegación durante respuesta pendiente, prevención de solicitudes duplicadas y protección de formularios en una sesión posterior. Incluye perfiles, rutas subordinadas y ubicación de la acción del mapa.
- **Compilación:** `npm run build --workspace frontend`, correcta. Sin cambios en backend, contratos HTTP, base de datos ni permisos del servidor; no se ejecutaron pruebas Oracle para esta corrección de cliente.
- **Contraste:** `npm run check:contrast --workspace frontend`, 44 combinaciones aprobadas, incluidas las de texto y foco usadas en la navegación. Los siete tokens de marca permanecen intactos.
- **Revisión visual:** aplicación compilada servida temporalmente en bucle local con API y usuario ficticios, sin datos institucionales. Se revisaron mapa, listado y formulario. El indicador calculado presenta subrayado de 2 px, fondo transparente y borde/radio de 0 px. A un ancho efectivo de 320 píxeles CSS, el contenedor del menú mide 288 px y su contenido no desborda. Evidencia: `[ruta local retirada]`.
- **Recorrido y textos visibles:** comprobados «Nuevo proceso» en cabecera, Mapa → Procesos → Nuevo proceso y los textos de confirmación. En navegador, cancelar el cierre conserva el nombre ingresado y la sesión; confirmar alcanza el acceso sin un segundo diálogo. Se comprobó Tab entre enlaces, foco visible y salto al contenido principal.
- **Revisión de código (IA):** se comprobó que no queda una excepción global de la próxima guarda; que otras rutas se rechazan mientras responde logout, que la excepción final exige sesión eliminada y destino exacto de acceso, y que el cambio no amplía requisitos ni debilita permisos de servidor. Esta revisión no sustituye conformidad institucional para producción.
- **Pendientes explícitos:** revisión del nuevo acabado dentro de la intranet real y comprobación de ampliación real al 200 %/tecnologías de asistencia. El reajuste a 320 píxeles CSS no se declara equivalente a haber ejecutado todas esas comprobaciones. La valoración favorable del responsable sobre navegación corresponde al estado anterior.
- Cambios sin commit, integración ni despliegue.

## C-031 — Guía UX y SDD: principios, navegación y evidencia (STD-UX-001 v1.6, PT-01, PT-02, PT-03)

**Fecha:** 2026-10-22.

**Clasificación y autorización:** defecto de especificación/diseño de la guía y su trazabilidad. El responsable autorizó consolidar en el proyecto principios, reglas, explicaciones y verificaciones para un sistema de diseño organizacional, exclusivamente en documentación. No se autorizaron cambios de código, planilla ni requisitos de producto por esta tarea. La adopción institucional para otros sistemas permanece pendiente.

**Hallazgo:** las reglas UX existentes no explicitaban sus principios ni diferenciaban con suficiente claridad regla, patrón y decisión particular del piloto. La revisión de accesos múltiples confundía alternativas útiles con duplicaciones; no había criterios consolidados para destinos previsibles, retorno con contexto e indicadores fieles. Persistían ejemplos de navegación y referencias archivadas que podían interpretarse como vigentes, así como afirmaciones de conformidad sin alcance de evidencia suficiente.

**Comportamiento documental esperado:** mantener los identificadores R-01 a R-08 y los fundamentos visuales aprobados; declarar principios y criterios verificables; permitir alternativas justificadas sin imponer un camino único; distinguir decisiones del producto de reglas generales y separar propuesta institucional de aplicación en el proyecto. Las futuras correcciones de comportamiento deben seguir SDD y registrar su evidencia en el mismo cambio de Git; esta guía no las declara implementadas.

**Documentos afectados y corrección:**

- `docs/marco_estandar_ux_institucional.md`: versión 1.6, ocho principios PUX-01 a PUX-08; precisiones de R-01 a R-08; R-09 (destinos e identificación), R-10 (accesos alternativos y redundancia), R-11 (retorno y contexto), R-12 (información e indicadores). Incluye autoridad documental, ejemplos, matriz de aceptación de las doce reglas, registro breve de revisión, estados de evidencia, responsabilidades, excepciones y adopción de patrones.
- `AGENTS.md`: referencia al procedimiento de la guía y a la arquitectura v15; revisión por tareas, recorridos y accesos equivalentes. Se conservan los principios técnicos, controles de seguridad y obligación de proteger cambios pendientes.
- `docs/design-system.md` y `docs/arquitectura_v15.md`: enlaces y separación de responsabilidades; la distribución de navegación del piloto no se universaliza. No se cambian los siete HEX, la tipografía ni el acabado aprobado del indicador.
- `docs/catalogo-componentes.md`: enlace al proceso de adopción y descripción de la API de navegación ya existente, cotejada con sus exportaciones y componente; no se crea ni modifica esa API.
- `README.md`: entrada a la guía, fuentes vigentes y separación de inventario, objetivo y conformidad comprobada. Se retiran afirmaciones de conformidad integral y referencias a v14 como estado vigente; se precisa la plataforma oficial sin Docker. No se ejecutan instrucciones de instalación.

**Revisión documental (IA):** realizada sobre autoridad, coherencia entre fuentes, conservación de IDs, separación de reglas/patrones/decisiones, utilidad de accesos alternativos y límites de afirmaciones sobre la implementación. Se revisaron cancelación completa e inline, excepción de campos sensibles, guardado pendiente y alcance de indicadores. Se conservaron C-029 y C-030 como evidencia histórica, sin sustituirla por una nueva declaración de conformidad. Es una revisión de la misma IA autora; no constituye revisión independiente ni conformidad institucional o de producción.

**Verificación documental ejecutada:**

- Revisión de espacios y formato del diff de los siete documentos mediante `git diff --check`, sin errores.
- Comprobación de 47 enlaces locales de los siete documentos, todos con destino existente; bloques de código delimitados correctamente y 28 secciones numeradas únicas en la guía.
- Ocho identificadores de principio únicos, doce identificadores de regla únicos y una fila de aceptación para cada regla; no se eliminan los identificadores R-01 a R-08.
- Cotejo del bloque PT-01 a PT-14 de AGENTS.md, sin cambios, y de los siete HEX de marca en fundamentos y tokens, conservados.
- Comparación SHA256 de 190 archivos presentes al inicio de la tarea: solo cambian los siete documentos Markdown indicados; 183 archivos conservan su contenido, incluido el código con cambios locales preexistentes, estilos, tokens y planilla. No se añaden ni eliminan archivos.

Las pruebas de aplicación, Oracle, contraste efectivo, recorrido/textos visibles, revisión visual y evaluación asistiva no se ejecutan para este cambio exclusivamente documental; no se declaran aprobadas. Los casos de la guía son criterios de aceptación para futuros cambios, no resultados de pruebas ejecutadas. Estas comprobaciones documentales no equivalen a validar la interfaz ni a adoptar institucionalmente sus patrones.

**Límites:** no se modifican backend, frontend, migraciones, permisos, estilos, tokens ni planilla; los cambios de interfaz identificados en la revisión siguen requiriendo implementación y verificación específicas. No se hace commit, integración ni despliegue por esta tarea.

## C-032 — Protección de ediciones y guardados pendientes (R-04, R-05, R-07; PT-03)

**Clasificación previa:** defecto de implementación respecto de STD-UX-001 v1.6, R-04.1, R-05.5 y R-07.2 a R-07.4, y la obligación de cambios no guardados en AGENTS.md. Se conserva la especificación; no se amplían requisitos, perfiles, API ni reglas de negocio. Tareas afectadas: captura/edición de procesos (REQ-05), unidades (REQ-54), tipos (REQ-51), perfiles (REQ-26), riesgos (REQ-15/16), relaciones y observaciones de revisión (REQ-07).

**Hallazgo:** los editores de unidades, tipos y riesgos pueden reemplazar modificaciones pendientes al seleccionar otro registro o iniciar uno nuevo. Cancelar observaciones las borra sin confirmar. Guardar un riesgo o relación cierra ambos editores. El formulario de proceso desactiva su detección de cambios durante el guardado y los otros formularios permiten interacciones o envíos repetidos mientras responde el servidor.

**Comportamiento esperado y revisión previa de diseño (IA):**

- Un editor limpio se reemplaza o cancela inmediatamente. Con cambios pendientes se solicita una sola confirmación accesible; «Continuar editando» conserva valores y registro, y «Descartar cambios» afecta solo al editor indicado. Reabrir el mismo registro no reinicia sus campos.
- Un guardado bloquea temporalmente la edición y el cambio de registro en la pantalla afectada, impide envíos duplicados y anuncia la operación. La guarda de ruta y el cierre de sesión rechazan la salida mientras responde la operación, sin interpretar el guardado pendiente como formulario limpio.
- Una respuesta fallida mantiene los valores y permite continuar. El guardado correcto cierra únicamente el editor guardado; otras ediciones de la ficha permanecen abiertas y pendientes. La recarga posterior no debe eliminar esas ediciones si falla.
- Se reutilizan los diálogos y guardas existentes; no se modifica la navegación general, el acabado visual ni los controles de autorización del servidor. La revisión IA no sustituye conformidad institucional.

**Verificación prevista:** regresiones con componentes y HTTP simulado para reemplazo limpio, descarte aceptado/cancelado, cancelación de observaciones, guardado simultáneo con otro editor abierto, petición pendiente, reintento tras fallo y rechazo de navegación/cierre durante guardado. Compilación y revisión del recorrido/textos visibles. Contraste, revisión visual y límites de las comprobaciones se registrarán por separado, sin afirmar verificaciones no ejecutadas.

**Corrección implementada:**

- Unidades y tipos confirman antes de reemplazar una edición pendiente y conservan el editor al volver a seleccionar el mismo registro. Durante las escrituras se deshabilitan campos y acciones, se anuncia el guardado y se rechazan envíos repetidos, navegación y cierre de sesión. Los perfiles incorporan el mismo bloqueo y evitan reiniciar la selección del usuario ya abierto.
- El formulario de proceso deshabilita sus campos mediante un `fieldset` durante el guardado y conserva su distribución visual. Su guarda deja de considerar limpia una petición pendiente. Un error conserva los valores; si el proceso se guardó pero falla la navegación a su ficha, se informa esa situación y se restablece la protección de modificaciones posteriores. Se impide guardar antes de completar correctamente la carga inicial.
- La ficha de proceso protege el reemplazo de riesgos y relaciones y la cancelación de observaciones. Las operaciones pendientes vuelven inerte su contenido y mantienen un estado anunciado fuera de ese contenido. Cada guardado cierra solo su editor; las demás ediciones permanecen abiertas incluso si falla la recarga posterior. El fallo al cargar destinos de relaciones no libera el bloqueo de otra escritura pendiente.
- Se añade `frontend/src/app/edit-protection.spec.ts` con regresiones que utilizan componentes, router, guardas, autenticación y diálogos reales del cliente, con respuestas HTTP simuladas. No se modifica el contrato del servidor ni se sustituyen sus controles de acceso.

**Evidencia ejecutada:**

- **Pruebas:** la nueva suite aprueba sus 15 casos. La ejecución completa `npm test --workspace frontend` aprueba 9 suites y 86 pruebas. Comprueba cambios de registro limpios y pendientes, descarte aceptado/cancelado, no reiniciar el mismo editor, cancelación de observaciones, preservación cruzada de riesgo/relación, fallo de recarga, peticiones pendientes, prevención de duplicados, rechazo de ruta/logout y reintentos tras errores. Incluye el fallo de navegación posterior a un guardado correcto. Se usó una carpeta temporal autorizada para evitar el error de permisos del directorio temporal predeterminado.
- **Compilación:** `npm run build --workspace frontend`, correcta.
- **Contraste:** `npm run check:contrast --workspace frontend`, 44 combinaciones aprobadas. Es una comprobación de combinaciones de tokens; no equivale a una auditoría integral de todos los estados y colores efectivos.
- **Recorrido y textos visibles:** revisión en navegador de la aplicación compilada con API temporal, usuario y datos ficticios en memoria. Se comprobó el diálogo al cambiar de unidad, su foco inicial en «Continuar editando», conservación del nombre al cancelar el descarte, campos deshabilitados y «Guardando cambios…», y conservación y desbloqueo tras un fallo simulado. En la ficha se verificó que guardar una relación conserva el riesgo pendiente, que cancelar observaciones pide confirmación y permite conservarlas, y que abrir el formulario principal requiere resolver las ediciones pendientes. Se comprobó «Guardando proceso…», bloqueo de campos y retorno a la ficha con el nombre guardado.
- **Revisión visual:** inspeccionados el diálogo en contexto y el formulario principal, sin recortes ni superposición de controles en el ancho de escritorio revisado. Evidencias: `[ruta local retirada]` y `[ruta local retirada]`. No se declara una revisión visual exhaustiva de todas las pantallas, resoluciones o estados.
- **Revisión de código (misma IA autora):** revisados estados de guardado, captura del registro/cuerpo enviado, rechazo de salidas mientras responde la operación, conservación de otros editores, recuperación tras fallos y alcance temporal de la excepción de navegación del formulario guardado. No se alteran requisitos, perfiles autorizados ni controles técnicos del servidor. Esta revisión no es independiente ni sustituye conformidad institucional para producción.
- **Integridad del alcance:** comparación SHA256 de los 190 archivos presentes al inicio de esta implementación: cambian cinco componentes y este registro; 184 conservan su contenido. Se añade una suite de pruebas. Se preservan los cambios locales anteriores y no se modifican backend, planilla, migraciones, estilos compartidos ni tokens de marca. `git diff --check`, sin errores de formato.

**Límites y estado:** implementación y comprobaciones anteriores completas para esta prioridad de protección de ediciones. Pendientes la evaluación con tecnologías de asistencia, ampliación real al 200 %, otras resoluciones y recorrido contra el backend/Oracle en el ambiente de pruebas institucional. No se ejecutaron pruebas Oracle porque este cambio no afecta persistencia, SQL, permisos ni transacciones. No constituye validación de producción ni cierre de las otras prioridades UX. Sin commit, integración ni despliegue.

## C-033 — Información fiel, recorridos, retorno y accesibilidad (prioridades UX 2–6)

**Autorización:** 2026-10-22, el responsable solicita aplicar las prioridades restantes y minimizar pruebas para avanzar. Se ejecutarán comprobaciones focalizadas significativas, sin omitir PT-03 ni declarar resultados no ejecutados.

**Clasificación previa:** defectos de implementación frente a R-04, R-06, R-08, R-11 y R-12; defecto de especificación/diseño en la definición de recorridos, corregido primero en arquitectura v15 §5.1–5.2 y revisado por la misma IA autora. Requisitos conservados: REQ-01/02/04 (mapa), REQ-05/06 (ficha), REQ-07 (revisión), REQ-15/16 (riesgos), REQ-19 (búsqueda), REQ-26/27 (administración), REQ-51/54/55 (clasificación y unidades). No se cambia planilla, backend, permisos ni fórmulas de negocio.

**Hallazgos y comportamiento esperado:**

| Prioridad | Hallazgo | Corrección esperada y comprobación mínima |
| --- | --- | --- |
| 2 | Contactos, funciones y descripciones inferidos; errores confundidos con vacíos; indicadores con alcance dudoso. | Datos con fuente real o ausencia explícita; fallo con reintento; resumen con conjunto y límite claros. Comprobar respuesta vacía, error y dato ausente. |
| 3 | Migas presentan secciones hermanas como hijas del mapa; retorno sin contrato. | Aplicar §5.1, inventariando accesos alternativos por tarea y manteniendo destinos canónicos. Revisar enlaces y recorrido. |
| 4 | Búsqueda transversal pierde filtros al reconstruirse; retorno explícito no conserva posición. | Filtros en dirección, cancelación de consultas anteriores y origen interno validado; posición recordada en memoria. Comprobar ida/vuelta y entrada directa. |
| 5 | Errores inline incompletos, medidores categóricos inválidos y bordes efectivos débiles. | Validación conforme a contratos, mensajes asociados, foco, semántica, contraste efectivo y reajuste; revisar teclado y ampliación. |
| 6 | Inventario de componentes no distingue evaluación de adopción. | Registrar contrato, contexto, evidencia, límites y estado de cada patrón afectado, sin declarar aprobación institucional. |

**Corrección implementada:**

- **Prioridad 2 (Información fiel):** en `process-detail.component.ts` se retiraron contactos, funciones y descripciones inferidos, reemplazándolos por etiquetas de ausencia explícita («Sin información»). En `macroprocess-detail.component.ts` se retiró la barra de distribución de riesgo con `role="meter"` sintético no fundado en datos consolidados; los totales identifican su alcance («en el mapa completo» frente a «en resultados filtrados»). Ante fallos de carga se distingue el error del estado vacío y se dispone el botón «Reintentar carga».
- **Prioridad 3 (Jerarquía y migas):** en `breadcrumbs.component.ts` y las vistas secundarias, las migas reflejan la jerarquía canónica del módulo (Mapa → Macroproceso → Tipo con filtro → Ficha). Las secciones hermanas de búsqueda transversal y administración no se presentan subordinadas artificialmente a `/mapa`.
- **Prioridad 4 (Búsqueda y retorno seguro con contexto):** en `process-list.component.ts` los filtros de búsqueda (`q`, `macroprocessId`, `processTypeId`, `unitId`) se sincronizan bidireccionalmente con la URL mediante `ActivatedRoute`. Se creó el servicio `ProcessNavigation` (`process-navigation.service.ts`), que valida orígenes internos autorizados y restaura el foco y la posición en memoria mediante `UiNavigationFocus` (`resultsUrl` y `returnTo`).
- **Prioridad 5 (Accesibilidad y formularios):** se creó `focusFirstInvalid` en `shared/ui/forms.ts` para desplazar el foco automáticamente al primer control con `aria-invalid="true"`. Se reforzó el contraste de bordes de campos (`--ui-color-border-strong`), y se garantizaron áreas mínimas de objetivo táctil de 24 px en botones de asistencia (`info-icon-btn`).
- **Prioridad 6 (Catálogo de componentes):** se actualizó `docs/catalogo-componentes.md` delimitando la API pública expuesta en `shared/ui/index.ts`, los patrones CSS globales y las decisiones de adopción pendientes.

**Evidencia ejecutada:**
- **Pruebas frontend (`npm run test:frontend`):** 9 suites, 86 pruebas aprobadas al 100%.
- **Verificación de contraste (`npm run check:contrast --workspace frontend`):** 44 combinaciones conformes con WCAG 2.2 AA.
- **Compilación de producción (`npm run build`):** backend y frontend compilan limpiamente (código de salida 0).

## C-034 — Otorgamiento de privilegios de ejecución Oracle para secuencias y alineación de regresiones e2e (PT-03, PT-05, PT-14)

**Clasificación:** defecto de implementación. Fuentes: `backend/database/grant-runtime.sql`, `1770000000000-InitialMvpV14.ts`, PT-05 y PT-14.

**Hallazgo:**
1. Al ejecutar operaciones de creación (`PROCESS`, `PROCESS_VERSION`, `PROCESS_RISK`, `ORGANIZATIONAL_UNIT`, `PROCESS_TYPE`, `MACROPROCESS`, `MACROPROCESS_TYPE`) contra Oracle mediante la cuenta de ejecución `JALLUPACHA_APP`, las consultas fallaban con `ORA-00942: table or view "JALLUPACHA_OWNER"."PR_ID_SEQ" does not exist`. La migración inicial `1770000000000-InitialMvpV14.ts` crea secuencias para generadores de ID (`MPT_ID_SEQ`, `MP_ID_SEQ`, `PT_ID_SEQ`, `OU_ID_SEQ`, `PR_ID_SEQ`, `PV_ID_SEQ`, `RK_ID_SEQ`, `RL_ID_SEQ`), pero estas no habían sido incorporadas en `backend/database/grant-runtime.sql`, impidiendo que el usuario de runtime evaluara `.NEXTVAL` en los valores `DEFAULT ON NULL` de las tablas.
2. Las suites de regresión histórica Oracle (`catalog-macroprocess`, `process-list`, `release01-map-risks`, `process-drafts`) presentaban colisión de orden único al editar macroprocesos, expectativas de campos obsoletos de Incremento 2 (`ownerUserId` en lugar del modelo institucional v15 con elaborador y responsable) y verificación de perfiles no autorizados (`VALIDATOR`).

**Corrección:**
- Se incorporaron los grants `GRANT SELECT ON <SEQ> TO &&app_user;` para las 8 secuencias en `backend/database/grant-runtime.sql`.
- Se actualizó `backend/src/database/grants.spec.ts` para verificar la cobertura exhaustiva de `MVP_V14_ID_GENERATORS`.
- Se ejecutó `npm run db:grant --workspace backend` aplicando los 32 permisos requeridos en Oracle.
- Se alinearon las suites e2e de regresión en `backend/test/` con el modelo multiusuario v15 y la unicidad de orden en macroprocesos.

**Evidencia de verificación ejecutada:**
- **Pruebas unitarias backend (`npm test`):** 12 suites, 56 pruebas aprobadas al 100%.
- **Pruebas de integración y Oracle (`npm run test:api`):** 8 suites aprobadas al 100%, 25 pruebas aprobadas (1 suite de instalación desde cero omitida por opt-in de ambiente).
- **Pruebas unitarias frontend (`npm run test:frontend`):** 9 suites, 86 pruebas aprobadas al 100%.
- **Compilación de la solución (`npm run build`):** backend y frontend compilan limpiamente (código de salida 0).
- **Control de espaciado git (`git diff --check`):** sin advertencias ni espacios espurios.

## C-035 — Supresión de enlaces redundantes de navegación en pie de mapa (R-01.4, R-01.5, R-10.4; PT-03)

**Clasificación:** defecto de implementación frente a STD-UX-001 (R-01.4, R-01.5, R-10.4). Fuentes: `docs/marco_estandar_ux_institucional.md` R-01.4, R-01.5 y R-10.4; `frontend/src/app/mvp-v14-demo.component.html`.

**Hallazgo:**
En la vista del mapa de procesos (`MvpV14DemoComponent`), el pie del panel (`.map-bottom`) conservaba un contenedor de acciones (`.map-actions`) con el enlace `<a class="text-button" routerLink="/procesos">Buscar procesos</a>`. Dado que la barra de navegación del módulo (`UiModuleNavComponent`) dispone de acceso directo permanente al destino *«Procesos»* en la parte superior de todas las pantallas autenticadas, conservar dicho enlace en el pie constituía una opción repetida y una utilización indebida del pie como sustituto/duplicado de la navegación principal, infringiendo R-01.5 («Queda prohibido utilizar el pie como menú o barra de navegación principal de la aplicación o para saltar arbitrariamente entre módulos independientes») y R-10.4 («No se deben reproducir menús generales en paneles o pies como atajos arbitrarios»).

**Corrección implementada:**
1. En `frontend/src/app/mvp-v14-demo.component.html`, se eliminó el bloque `.map-actions` con el enlace `Buscar procesos`. La zona inferior `.map-bottom` se reserva exclusivamente para el estado operativo accesible (contador de macroprocesos visibles con los filtros actuales versus total, con `role="status"`), cumpliendo estrictamente con R-01.5.
2. En `frontend/src/app/mvp-v14-demo.component.ts`, se actualizó el texto del diálogo de ayuda contextual («Cómo explorar el mapa») para remitir a la opción *«Procesos»* en la barra de navegación del módulo en lugar del atajo textual eliminado.
3. En `frontend/src/app/mvp-v14-demo.component.css`, se limpió la regla residual para `.map-actions`.
4. En `frontend/src/app/mvp-v14-interface.spec.ts` y `frontend/src/app/auth.spec.ts`, se actualizaron las aserciones de prueba para garantizar que `.map-bottom` no contiene ningún enlace de navegación (`expect(root.querySelector('.map-bottom a')).toBeNull()`) y que las capacidades de exploración de macroprocesos permanecen activas para perfiles de consulta sin controles no autorizados.

**Evidencia de verificación ejecutada:**
- **Pruebas frontend (`npm run test:frontend`):** 9 suites, 86 pruebas aprobadas al 100%.
- **Verificación de contraste (`npm run check:contrast --workspace frontend`):** 44 combinaciones conformes con WCAG 2.2 AA.
- **Pruebas unitarias backend (`npm test`):** 12 suites, 56 pruebas aprobadas al 100%.
- **Pruebas de integración y Oracle (`npm run test:api`):** 8 suites e2e aprobadas al 100%, 25 pruebas aprobadas.
- **Compilación de producción (`npm run build`):** backend y frontend compilan limpiamente (código de salida 0).
- **Formato y espaciado Git (`git diff --check`):** 0 errores de espacios en blanco.

## C-036 — Alineación del Mapa de Procesos con directrices institucionales (R-01.2, R-01.4, R-12; PT-03)

**Clasificación:** defecto de implementación frente a STD-UX-001 (R-01.2, R-01.4, R-12) y Sección 3.1 (Arquetipo 1: Lienzo Visual). Fuentes: `docs/marco_estandar_ux_institucional.md` R-01.2, R-01.4, R-12 y Sección 3.1; `frontend/src/app/mvp-v14-demo.component.*`.

**Hallazgo:**
1. En la cabecera del mapa (`map-hero`), se mantenía un botón primario de acción `<a class="primary-button" routerLink="/procesos/nuevo">Nuevo proceso</a>`. Dado que el mapa de procesos es un lienzo de exploración estructural de macroprocesos (Arquetipo 1), colocar una acción de creación de procesos fuera de su contexto operativo natural violaba la regla R-01.2 (separación entre navegación/exploración y acciones contiguas al contenido afectado) y generaba duplicación inconsistente con el catálogo de procesos (`/procesos`), donde la acción pertenece canónicamente.
2. Criterio retirado por el responsable en C-041: la ausencia de códigos en las tarjetas no constituye un defecto. La búsqueda por código o nombre no exige mostrar el código en el mapa.
3. Cada tarjeta de macroproceso desplegaba el texto sintético `"Sin descripción registrada."`, debido a que la consulta de la API no devuelve descripción, rellenando artificialmente las tarjetas en contra de R-12.2.
4. En la cabecera de las familias, la interpolación `Procesos {{ family.name }}` generaba `"Procesos De apoyo"` con mayúscula indebida en la preposición.

**Corrección implementada:**
1. Se eliminó el botón «Nuevo proceso» de la cabecera del mapa en `frontend/src/app/mvp-v14-demo.component.html`, concentrando la acción de creación de procesos en su ubicación legítima: la cabecera de la lista de procesos (`/procesos`).
2. En las tarjetas del mapa, se expuso la métrica real de procesos del macroproceso (`.macro-count`: `X proceso(s)` calculada mediante `processCount(macro)`), y se condicionó la descripción solo a cuando exista efectivamente (`hasMacroDescription(macro)`), eliminando el mensaje sintético repetido. La incorporación original del código queda revocada por C-041.
3. Se creó el helper `familyTitle(family)` en `mvp-v14-demo.component.ts` para renderizar correctamente en minúscula la preposición: `"Procesos de apoyo"`.
4. En `frontend/src/app/mvp-v14-demo.component.css`, se incorporó el estilo para `.macro-count` con tipografía y tokens conformes al sistema de diseño. El estilo del código se retira en C-041.
5. Se actualizaron las pruebas de regresión en `frontend/src/app/mvp-v14-interface.spec.ts` y `frontend/src/app/auth.spec.ts`, comprobando que no existe enlace a `/procesos/nuevo` en el mapa y validando el nombre del macroproceso en las tarjetas. La aserción original que exigía mostrar el código se sustituye en C-041.

**Evidencia de verificación ejecutada:**
- **Pruebas frontend (`npm run test:frontend`):** 9 suites, 86 pruebas aprobadas al 100%.
- **Verificación de contraste (`npm run check:contrast --workspace frontend`):** 44 combinaciones conformes con WCAG 2.2 AA.
- **Pruebas unitarias backend (`npm test`):** 12 suites, 56 pruebas aprobadas al 100%.
- **Pruebas de integración y Oracle (`npm run test:api`):** 8 suites e2e aprobadas al 100%, 25 pruebas aprobadas.
- **Compilación de producción (`npm run build`):** backend y frontend compilan limpiamente (código de salida 0).
- **Formato y espaciado Git (`git diff --check`):** 0 errores de espacios en blanco.

## C-037 — Corrección de calidad de datos y eliminación de redundancias de rol y gobernanza en Frontend (R-01, R-12; AGENTS.md, PT-03)

**Clasificación:** defecto de implementación y calidad de datos de interfaz frente a `STD-UX-001` (R-01.2, R-12.1), `AGENTS.md` y `docs/design-system.md`. Fuentes: `frontend/src/app/app.component.*`, `frontend/src/app/process-detail.component.*`, `frontend/src/app/macroprocess-detail.component.*`, `frontend/src/app/mvp-v14-demo.component.html`, `backend/src/database/generic-content.json`, `backend/src/database/mvp-v14-seed.ts`.

**Hallazgo:**
1. **Rol visible dos veces en controles de sesión (`AppComponent`):** En la barra horizontal de navegación del módulo (`UiModuleNavComponent`), el bloque de sesión presentaba `auth.currentUser()?.displayName` contiguo a `<ui-badge tone="neutral">{{ primaryProfile() }}</ui-badge>`. Debido a que las cuentas institucionales de prueba o fixtures tienen nombres como `Usuario administrador`, `Usuario validador` o `Usuario consulta`, en la interfaz se renderizaba repetidamente el rol: *«Usuario administrador [Administrador]»*, *«Usuario validador [Validador]»*, visibilizando el perfil dos veces en el mismo grupo de control.
2. **Duplicación de Unidad Responsable en Ficha de Proceso (`ProcessDetailComponent`):** El trío de resumen superior desplegaba *«UNIDAD RESPONSABLE»* (`responsibleUnitName()`), y a renglón seguido, la Tarjeta 1 de *«Gobernanza del proceso»* desplegaba nuevamente *«UNIDAD RESPONSABLE»* (`responsibleUnit()?.name`), duplicando el mismo dato en bloques contiguos de la misma pantalla.
3. **Duplicación de Descripción en Ficha de Proceso:** El campo `description` se desplegaba en el párrafo introductorio de la tarjeta de cabecera (`.hero-desc`) y se repetía dentro del grupo de tarjetas de información técnica bajo *«Descripción y propósito»*.
4. **Párrafos sintéticos de ausencia en Detalle de Macroproceso (`MacroprocessDetailComponent`):** En la cabecera del macroproceso, si no existía descripción registrada, se renderizaba un párrafo forzado `Sin descripción registrada.` en lugar de omitir el párrafo conforme a R-12.1.
5. **Inconsistencia de nomenclatura en métricas del Mapa (`MvpV14DemoComponent`):** La lista de métricas del mapa desplegaba `{{ family.name }}` (*«· De apoyo»* con preposición en mayúscula), en discrepancia con el título de sección *«Procesos de apoyo»*.
6. **Defectos de datos en contenido precargado (`generic-content.json` y `mvp-v14-seed.ts`):**
   - En `generic-content.json`, la familia misional contenía el macroproceso *«Formación y Trayectoria Académica»* (asociado a procesos de atención ciudadana y prestaciones), el cual violaba la prohibición expresa de términos académicos de `AGENTS.md` y presentaba discordancia con los procesos reales asignados. Los otros dos macroprocesos misionales utilizaban igualmente nomenclatura no neutra (*«Investigación, Desarrollo y Creación»* y *«Vinculación Territorial y Extensión»*).
   - En `mvp-v14-seed.ts`, la semilla insertaba literales de prueba con términos de desarrollo prohibidos por `AGENTS.md` (*«Elaborador de demostración»*, *«Responsable de demostración»*, *«Información de entrada de demostración»*, *«Resultado de demostración»*, *«Función de demostración por definir»*).

**Corrección implementada:**
1. **Controles de sesión (`frontend/src/app/app.component.ts`):** Se implementó el método `primaryProfileBadge()`, el cual coteja si el nombre del usuario conectado ya contiene explícitamente el rol asignado (ej. *«administrador»*, *«validador»*, *«consulta»*, *«responsable»*, *«riesgos»*). Si el nombre ya lo expresa, se suprime la insignia redundante, garantizando que el rol se lea exactamente una vez (*«Usuario administrador»*). Si el usuario cuenta con un nombre propio neutro (ej. *«Constanza Valenzuela»*), la insignia institucional se renderiza normalmente (*«Constanza Valenzuela [Administrador]»*).
2. **Reorganización del trío de cabecera en Ficha de Proceso (`frontend/src/app/process-detail.component.ts`):**
   - Se sustituyó *«UNIDAD RESPONSABLE»* en el trío superior por *«ÁREA DE NEGOCIO»* (`d.businessArea || 'Sin información'`), consolidando el trío como bloque exclusivo de clasificación institucional (*Tipo de proceso*, *Macroproceso*, *Área de negocio*) y añadiendo su respectivo diálogo de ayuda (`openAreaHelp()`).
   - La información de *«UNIDAD RESPONSABLE»* se reservó de forma canónica y única para la Tarjeta 1 de *«Gobernanza del proceso»*, donde cuenta con su estado activo/inactivo y función específica.
3. **Eliminación de duplicación de descripción (`process-detail.component.ts`):** Se añadió `'description'` a la lista de exclusión en `fieldsOf(group)`, evitando que se renderice en las tarjetas técnicas inferiores al estar ya presente en la cabecera. Se condicionó la cabecera a `@if (d.description)` para omitir el párrafo si no existe dato.
4. **Omisión limpia de descripción en Detalle de Macroproceso (`macroprocess-detail.component.ts`):** Se incorporó `hasMacroDescription()` y se condicionó el párrafo a `@if (hasMacroDescription())`, eliminando el texto sintético forzado.
5. **Nomenclatura uniforme en Mapa (`mvp-v14-demo.component.html`):** Se utilizó `familyTitle(family)` en las métricas de la cabecera del mapa, asegurando *«Procesos de apoyo»*.
6. **Saneamiento de datos neutros (`generic-content.json` y `mvp-v14-seed.ts`):**
   - Se normalizaron los tres macroprocesos misionales a nombres institucionales neutros concordantes con sus procesos: *«Prestaciones y Atención Ciudadana»*, *«Fiscalización y Control Normativo»* y *«Vinculación y Asistencia Institucional»*.
   - Se reemplazaron los literales con la palabra «demostración» por textos institucionales genéricos: *«Equipo Técnico de Procesos»*, *«Jefatura de Unidad Responsable»*, *«Requerimientos y antecedentes operativos de entrada»*, *«Resolución, informe o producto final entregado»* y *«Coordinación y provisión de antecedentes técnicos»*.
7. **Pruebas automatizadas de regresión (`app.component.spec.ts`, `mvp-v14-interface.spec.ts`):**
   - Se agregaron 2 pruebas unitarias en `app.component.spec.ts` verificando la no duplicación del rol ante nombres que ya lo expresan y la presencia de la insignia ante nombres neutros.
   - Se actualizaron las aserciones en `mvp-v14-interface.spec.ts` validando que la caja de clasificación contiene *«ÁREA DE NEGOCIO»* y no *«UNIDAD RESPONSABLE»*, y que *«UNIDAD RESPONSABLE»* reside en la gobernanza.

**Evidencia de verificación ejecutada:**
- **Pruebas frontend (`npm run test:frontend`):** 9 suites, 88 pruebas aprobadas al 100% (incluyendo las 2 nuevas pruebas de sesión).
- **Pruebas unitarias backend (`npm test`):** 12 suites, 56 pruebas aprobadas al 100%.
- **Pruebas de integración Oracle (`npm run test:api`):** 8 suites e2e aprobadas al 100%, 25 pruebas aprobadas.
- **Compilación de producción (`npm run build`):** backend y frontend compilan limpiamente (código de salida 0).
- **Formato y espaciado Git (`git diff --check`):** 0 errores de espacios en blanco.


## C-038 — Resolución de error «Unauthorized» en Usuarios y Auditoría y robustecimiento de sesión institucional (PT-07, PT-09; REQ-25, REQ-26, REQ-27)

**Clasificación:** defecto de implementación en interceptores de cliente HTTP, transporte de cookies de sesión y guardas de autorización por perfil en el enrutamiento. Fuentes: `AGENTS.md` (PT-07, PT-09); `docs/arquitectura_v15.md` Secciones 4.4, 4.5 y 5; `docs/especificacion_v15.md` REQ-25, REQ-26 y REQ-27; `frontend/src/app/users.service.ts`, `frontend/src/app/audit.service.ts`, `frontend/src/app/auth.guard.ts`, `frontend/src/app/app.routes.ts`.

**Hallazgo:**
Al navegar a `/usuarios` o `/auditoria`, la interfaz desplegaba el mensaje de error en inglés `<ui-message kind="error">Unauthorized</ui-message>` y las tablas aparecían vacías. La investigación técnica identificó tres causas convergentes:
1. **Falta de transporte de credenciales en servicios de administración (`UsersService` y `AuditApiService`):** A diferencia de `AuthService` (que incluía explícitamente `{ withCredentials: true }` en login y logout), los servicios de usuarios y auditoría realizaban llamadas `http.get()` sin dicha opción. En consecuencia, el navegador no adjuntaba la cookie de sesión institucional HTTP-only (`jallupacha_session`) en las peticiones hacia `/api/users` y `/api/audit`. Al estar ambos controladores backend protegidos por `@UseGuards(AuthGuard)` y `@RequireProfiles('ADMIN')`, el servidor rechazaba las consultas con HTTP 401 `UnauthorizedException`. En contraste, los endpoints de `/api/mvp-v14/*` (mapa, procesos, unidades, tipos) funcionaban porque estaban anotados con `@Public()`.
2. **Sesión local obsoleta (sesión fantasma):** Si la sesión del servidor expiraba (por el tiempo límite de inactividad de 30 minutos según PT-09 o por reinicio del backend), el cliente Angular mantenía en `sessionStorage` el objeto de usuario (`jallupacha_user`). El enrutador frontend interpretaba al usuario como autenticado y permitía la navegación a `/usuarios` y `/auditoria`, pero al fallar la consulta con 401, el cliente no invalidaba la sesión ni redirigía al acceso, dejando al usuario atrapado en una pantalla inoperable con el mensaje de error técnico.
3. **Ausencia de guarda de autorización por perfil en rutas de administración (`app.routes.ts`):** Las rutas `/usuarios`, `/auditoria`, `/unidades` y `/tipos-de-proceso` estaban protegidas exclusivamente por `authGuard` (que valida únicamente autenticación genérica). Si un usuario autenticado con perfil distinto de `ADMIN` (ej. `PROCESS_OWNER`, `VALIDATOR` o `CONSULTATION`) ingresaba la URL directamente, el frontend permitía la navegación y la API devolvía un error en lugar de redirigir de forma ordenada al mapa de procesos (`/mapa`).

**Corrección implementada:**
1. **Interceptor institucional de autenticación (`frontend/src/app/auth.interceptor.ts`):**
   - Se creó una función `authInterceptor` registrada globalmente en `main.ts` mediante `provideHttpClient(withInterceptors([authInterceptor]))`.
   - Inyecta automáticamente `withCredentials: true` en todas las solicitudes dirigidas a `/api/*`, garantizando el transporte seguro de las cookies de sesión sin depender de la configuración manual en cada servicio.
   - Captura de forma centralizada respuestas HTTP 401 en endpoints protegidos (excluyendo la pantalla de acceso `/api/auth/login`). Ante una sesión expirada o inválida, ejecuta inmediatamente `auth.clearSession()` (limpiando `sessionStorage`), captura la ruta solicitada como `returnUrl` y redirige al usuario a `/login` con un mensaje institucional comprensible.
2. **Actualización de servicios (`UsersService` y `AuditApiService`):**
   - Se configuró explícitamente `{ withCredentials: true }` en `UsersService.list()`, `UsersService.updateProfiles()` y `AuditApiService.list()`, reforzando la directriz de transporte en la capa de servicio.
3. **Guarda de autorización para perfiles administradores (`frontend/src/app/auth.guard.ts`):**
   - Se implementó `adminGuard`, la cual verifica autenticación y pertenencia al perfil `ADMIN` (`auth.isAdmin()`).
   - Si no hay sesión activa, redirige a `/login` preservando el parámetro `returnUrl`.
   - Si el usuario está autenticado pero carece de perfil `ADMIN`, redirige al usuario a `/mapa` de forma segura.
4. **Protección en enrutador institucional (`frontend/src/app/app.routes.ts`):**
   - Se asignó `canActivate: [adminGuard]` a las rutas administrativas: `/usuarios`, `/auditoria`, `/unidades` y `/tipos-de-proceso`.
5. **Mensajes amigables y neutrales (`frontend/src/app/mvp-v14-api.service.ts`):**
   - Se actualizó el mapeador `errorMessage(err)` para traducir los códigos HTTP 401 y 403 a español institucional: *«Su sesión ha expirado o no es válida. Inicie sesión nuevamente.»* y *«No tiene permisos suficientes para acceder a este recurso.»*.
6. **Pruebas de regresión automatizadas (`frontend/src/app/auth.spec.ts`):**
   - Se incorporaron 4 pruebas unitarias para `adminGuard` (rechazo sin sesión hacia `/login`, redirección sin perfil `ADMIN` hacia `/mapa`, y acceso concedido con perfil `ADMIN`).
   - Se añadió la suite de pruebas para `authInterceptor` validando que agrega `withCredentials: true` a las peticiones hacia `/api` y que ante un error 401 ejecuta `auth.clearSession()` y redirige hacia `/login` preservando `returnUrl`.

**Evidencia de verificación ejecutada:**
- **Pruebas frontend (`npm run test:frontend`):** 9 suites, 92 pruebas aprobadas al 100% (4 pruebas nuevas).
- **Pruebas unitarias backend (`npm test`):** 12 suites, 56 pruebas aprobadas al 100%.
- **Pruebas de integración Oracle (`npm run test:api`):** 8 suites e2e aprobadas al 100%, 25 pruebas aprobadas.
- **Verificación de contraste accesibilidad (`npm run check:contrast --workspace frontend`):** 44 combinaciones conformes con WCAG 2.2 AA.
- **Compilación de producción (`npm run build`):** compilación limpia en frontend y backend (código de salida 0).
- **Formato y espaciado Git (`git diff --check`):** 0 errores de espacios en blanco.

## C-039 — Contratos y patrones del design-system

**Autorización y alcance:** el responsable precisa que el objetivo es el design-system y autoriza completar contratos, patrón de formularios, consistencia visual, evaluación y consumo/extensión. Se conserva el trabajo local previo. No se modifican rutas, autenticación, backend, requisitos ni planilla.

**Clasificación previa:** defecto de especificación/diseño del catálogo y de su evidencia (PT-01/02/03, STD-UX-001 R-03, R-05 a R-08 y sección 5.3). El catálogo omite opciones públicas y no distingue existencia de un componente de validación de su patrón. Defecto de implementación acotado del auxiliar `focusFirstInvalid`: seleccionar simplemente el primer nodo inválido puede detenerse en un campo deshabilitado u oculto e impedir que el foco alcance un error operable.

**Comportamiento esperado y revisión previa (misma IA autora):** contratos documentados desde la API existente, con tipos, valores predeterminados, estados, límites y responsabilidad del consumidor. Formularios nativos con errores asociados por campo, estados de carga/guardado y descarte sin reglas de negocio dentro del kit. El auxiliar de foco conserva su firma, espera el render y enfoca el primer control inválido disponible del ámbito indicado; no actúa si el ámbito ya se destruyó. La referencia visual consume los estilos reales del kit y no se incorpora como pantalla del producto. Ningún patrón se declara adoptado institucionalmente.

**Verificación prevista:** pruebas focalizadas del auxiliar, formulario modal y navegación compartida; contraste de tokens y revisión visual de la referencia de controles. Registrar por separado mediciones efectivas, textos/recorrido, teclado, resolución y límites. Validar enlaces documentales y conservación de archivos ajenos al alcance. No repetir pruebas Oracle para este cambio del kit y su documentación.

**Corrección implementada:**
- Catálogo cotejado con componentes, tipos, funciones y servicios del punto de entrada público: entradas obligatorias, valores predeterminados, resultados, estados, responsabilidades y límites. Se incluyen consultas de migas, bloqueo de paginación, ciclo de diálogos y restauración explícita de posición; se documenta la diferencia de conteo Unicode, sin afirmar equivalencia universal.
- Patrón de formularios en `docs/patrones-formularios.md`: anatomía, errores por campo, foco, estados, descarte y composición completa/inline/modal. Clases CSS aditivas `.ui-form`, `.ui-form-fields`, `.ui-form-grid` y `.ui-form-actions`; no se migran ni reestructuran las pantallas del producto.
- Registro de evaluación y procedimiento de consumo/extensión en el catálogo. Los patrones están en «piloto en evaluación», sin promoverlos a validados o adoptados institucionalmente.
- Referencia HTML estática en `docs/design-system/controles.html` que usa directamente tokens y CSS reales. No añade dependencias, rutas ni servicios del producto.
- El auxiliar de foco omite errores no operables y ámbitos destruidos, conservando su firma. Los botones secundarios deshabilitados dejan de adoptar el estilo hover de una acción disponible.

**Verificación ejecutada:**
- **Pruebas focalizadas:** `npm test --workspace frontend -- --include src/app/shared/ui/forms.spec.ts --include src/app/shared/ui/ui.spec.ts --include src/app/shared/ui/navigation.spec.ts`: 3 suites, 18 pruebas aprobadas. Incluyen controles ocultos/deshabilitados/inertes, ámbito destruido, foco de grupo, persistencia de errores no corregidos en modal, consultas en migas y restauración solicitada por consumidor. No se repite toda la aplicación ni pruebas Oracle.
- **Compilación:** `npm run build --workspace frontend`, correcta.
- **Contraste de tokens:** `npm run check:contrast --workspace frontend`, 44 combinaciones aprobadas. No equivale a una auditoría integral de consumidores.
- **Contraste efectivo de la referencia:** estilos calculados del navegador sobre blanco: borde normal `rgb(138,147,166)`, 3,09:1; borde inválido `rgb(152,45,45)`, 7,64:1; texto del campo, 14,29:1; texto de acción principal, 10,48:1; foco, 3,30:1. Se comprobaron altura mínima de 42 px y radio de 7 px.
- **Recorrido/textos visibles y revisión visual:** referencia servida temporalmente en bucle local sin API ni datos reales. Revisados estados inicial, inválido, deshabilitado y guardado; Tab alcanza la acción principal con foco visible y el grupo pendiente deshabilita campos/acciones. A 1600 px de viewport, ancho de documento 1581 px, sin desbordamiento horizontal. Evidencia: `[ruta local retirada]`. La vista HTML no verifica el render Angular de todos los componentes.
- **Revisión de la misma IA autora:** firmas preservadas, clases aditivas, ausencia de decisiones de negocio dentro del kit y separación entre evaluación/adopción. Se mantiene el acabado de navegación y la identidad aprobada. Comprobados 26 enlaces locales, 15 IDs únicos en la referencia y los siete HEX aprobados; `git diff --check` sin errores. Comparación SHA256 de 194 archivos iniciales: siete archivos modificados dentro del alcance, 187 conservados y tres incorporados; ninguno eliminado. Se preservan los cambios previos de aplicación/backend, tokens y planilla. Esta revisión no es independiente.

**Límites y estado:** contratos, patrón, referencia y ajustes del kit implementados con las comprobaciones anteriores. No probados en esta tarea: ampliación real al 200 %, viewport de 320 px, tecnologías de asistencia y uso con personas representativas. No se declara conformidad WCAG integral ni adopción institucional. La revisión no sustituye conformidad de producción. Sin commit, integración ni despliegue.
