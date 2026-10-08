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