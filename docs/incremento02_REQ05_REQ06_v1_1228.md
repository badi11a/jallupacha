# Incremento 2 — Creación y ficha de procesos

Estado: aprobado para implementación por solicitud del responsable. Este documento no sustituye v13. Complementa especificacion.md y arquitectura.md; el responsable seleccionó REQ-05 y REQ-06. Las decisiones de representación de campos siguientes son decisiones de diseño de este incremento, no reglas atribuidas a la planilla.

## Alcance y límites

Implementar creación y edición de Borradores, ficha, responsabilidad y reasignación administrativa. Dependencias existentes: REQ-01 y REQ-51; permisos de REQ-26, auditoría REQ-27 y todos los Principios técnicos aplicables.

No implementar envío a revisión, aprobación, rechazo, historial visible, retiro, archivos, asociación de unidades o relaciones. La condición de REQ-05 para enviar a revisión se conserva para el siguiente incremento: nombre, macroproceso y tipo. REQ-05/06 no se declaran totalmente completados cuando un criterio depende de funciones posteriores.

## Recorrido funcional

El dueño abre Nuevo proceso, selecciona macroproceso y tipo, completa opcionalmente la información y guarda. El servidor asigna código y responsable. El proceso se abre en Borrador, editable por responsable con perfil Dueño o Administrador. Cualquier usuario autenticado puede abrirlo en lectura. El administrador puede reasignarlo a un usuario con perfil Dueño; la ficha muestra siempre el responsable actual.

Listado mínimo paginado de procesos con código, nombre, macroproceso, tipo, responsable y estado; permite abrir una ficha y acceder a Nuevo proceso según permisos. Sirve como entrada a estas funciones, no implementa todavía árbol, búsqueda ni filtros avanzados. Un proceso sin nombre se muestra como Sin nombre en el listado, sin persistir esa etiqueta como nombre real.

## Campos y representación propuesta

| Campos | Representación y validación |
| --- | --- |
| Código | Generado por servidor, único e inmutable; prefijo PR y secuencia Oracle. No aceptarlo del cliente. |
| Responsable | ID de usuario, asignado al creador; reasignación solo por Administrador hacia perfil Dueño. No admitirlo en la edición general. |
| Estado | Borrador generado por servidor; siempre visible; cliente no puede cambiarlo. |
| Macroproceso y tipo | Referencias a catálogos activos. Obligatorios al crear: v13 exige pertenencia a uno de cada uno, incluso si el resto de la ficha está incompleto. |
| Nombre y alias | Texto opcional en Borrador; máximo 250 caracteres como límite técnico propuesto. No imponer unicidad del nombre. |
| Descripción, objetivo, alcance, entradas, salidas, proveedores, clientes, cuándo inicia, cuándo termina, plan de desarrollo, operación, diseño y validación del proceso | Texto multilinea opcional, máximo 10000 caracteres por campo. Sin HTML ni expresiones ejecutables. |
| Involucrados | Texto opcional, por cargos o unidades, nunca nombres de personas (REQ-35). Ayuda breve junto al campo. |
| Área de negocio, tipo de subproceso, criticidad, grado de automatización y periodicidad | Texto opcional, máximo 250 caracteres; sin listas de valores inventadas. Estas representaciones requieren revisión del diseño, no agregan taxonomías. |
| Proceso padre | Referencia opcional a proceso existente mediante selector. Representación propuesta; impedir referencia a sí mismo y ciclos de parentesco como control de integridad. No confundir con REQ-14 ni implementar diagrama/relaciones. |
| Unidades internas y modelo BPMN | Secciones visibles sin acción de asociación/carga; mostrar Sin información, sin mensajes repetidos de prototipo. No simular documentación inexistente. |

Los campos vacíos opcionales se guardan como NULL. Mostrar todos los campos en la ficha, aunque estén vacíos. Etiquetas en español y presentación conforme C-001. No introducir nuevos datos personales. El responsable se resuelve por ID vigente; no copiar su nombre/correo al historial o auditoría.

## Permisos

| Acción | Actor |
| --- | --- |
| Crear | Dueño de proceso; Administrador puede carga inicial conforme perfil de Inicio. |
| Leer listado/ficha | Cualquier usuario autenticado, incluido Consulta. |
| Editar | Responsable con perfil Dueño o Administrador. |
| Reasignar | Administrador; destino con perfil Dueño. |

Creación administrativa: creador queda responsable según REQ-05; puede reasignar por operación específica. No añadir obligación de autoasignarse perfil Dueño para crear, ni ofrecer cambio libre de propietario en formularios de edición. Verificar perfiles y responsabilidad en cada solicitud. Perder el perfil no borra el proceso; Administrador conserva gestión y reasignación.

## Validaciones y fallos

Rechazar campos desconocidos, estados/códigos/propietarios manipulados y datos que excedan límites. Referencias inexistentes: rechazo claro. Catálogos inactivos: rechazo, sin cambio ni auditoría de cambio exitoso. Actor sin permiso: 403. Sin sesión: 401. Proceso inexistente: 404. Edición con revisión técnica anterior: 409, conserva cambios vigentes y permite recargar; no sobrescribir silenciosamente.

Guardar creación/edición/reasignación y su auditoría en una transacción. Si falla auditoría, revertir el cambio. Bloquear los catálogos en el mismo protocolo utilizado por su desactivación. Desde este incremento REQ-04 y REQ-51 verifican procesos reales activos, no únicamente catálogos vacíos; indicar conteo al impedir desactivación.

## Modelo Oracle mínimo

- PROCESS: ID generado, CODE único, OWNER_USER_ID con FK, CURRENT_VERSION_ID nullable para siguiente incremento y marca de actividad. No representar propietarios con texto libre.
- PROCESS_VERSION: ID, PROCESS_ID, VERSION_NUMBER inicialmente 1, STATUS inicialmente Borrador, MACROPROCESS_ID y PROCESS_TYPE_ID con FK, campos de ficha y REVISION para concurrencia. Clave única proceso/número de versión. El proceso padre referencia PROCESS mediante FK nullable.
- No crear tablas de riesgos, documentos, unidades o relaciones. Historial y aprobación se incorporan en su incremento; conservar estructura que permita agregar versiones sin sobrescribir un Vigente.
- VARCHAR2 con semántica de caracteres para campos breves; CLOB para campos largos, NUMBER(1) para banderas. Fechas técnicas en UTC. Migraciones versionadas por cuenta propietaria; permisos de ejecución específicos. Auditoría reutiliza su tabla y servicio existentes.

## API mínima

| Ruta | Comportamiento |
| --- | --- |
| GET /api/processes | Listado paginado con límite máximo 100; sin filtros nuevos. |
| POST /api/processes | Crea proceso y Borrador con código/responsable de servidor. 201. |
| GET /api/processes/:id | Todos los campos y responsable actual; valores ausentes explícitos. |
| PATCH /api/processes/:id | Edición de ficha con revisión técnica obligatoria; devuelve revisión actualizada. |
| PATCH /api/processes/:id/owner | Administrador envía ownerUserId y revisión técnica; reasigna y registra auditoría. |

Documentar DTO y respuestas mediante OpenAPI. El cliente no envía objetos de entidad ni SQL. Para selector de reasignación, ofrecer solo candidatos con perfil Dueño; aplicar autorización también al endpoint de usuarios existente, sin exponerlo a Consulta.

## Verificación proporcional

Una suite Oracle del recorrido crear Borrador incompleto → abrir ficha → editar → recargar → verificar auditoría y propietario. Casos focalizados: Consulta y dueño ajeno reciben 403 al editar; reasignación válida e inválida; código inmutable; revisión obsoleta rechazada; catálogos en uso no desactivables; rollback si falla auditoría. Pruebas de referencia padre contra sí mismo/ciclo si se aprueba esa representación.

Una prueba de interfaz del recorrido y revisión manual de campos, estado, etiquetas y lectura sin acciones de escritura. Ejecutar builds/suites afectadas; no repetir pruebas ajenas. Registrar evidencia y revisión PT-03. La recreación en esquema aislado PT-05 continúa pendiente por decisión del responsable y no se declara ejecutada.

## Riesgos resueltos por diseño

Suplantación de propietario/código/estado: campos administrados por servidor. Edición ajena: autorización por ID. Sobrescritura: revisión optimista. Referencia a catálogo desactivado: bloqueo coordinado. Cambio sin rastro: transacción con auditoría. Presentación del entorno como producto: aceptación C-001. Una ficha incompleta es válida en Borrador; no fingir que pasó aprobación.

## Implementación y evidencia

Implementación del alcance descrito arriba: completada en el entorno local; revisión registrada antes de integrar y verificaciones de producción siguen pendientes.

- `npm run build --workspace backend`: correcto después de los cambios finales.
- `npm run build --workspace frontend`: correcto.
- `npm run test:e2e --workspace backend -- --runTestsByPath test/processes.e2e-spec.ts`: 6/6 pruebas correctas; cubren autenticación/perfiles, CSRF, campos de servidor y validación de texto.
- La primera ejecución de esa suite en paralelo con build y generación OpenAPI terminó anormalmente en el runner; repetida de forma aislada, pasó 6/6.
- `npm run test:e2e --workspace backend -- --runTestsByPath test/process-drafts.oracle.e2e-spec.ts`: 1/1 prueba Oracle correcta; cubre creación, edición, recarga, auditoría, reasignación, revisión obsoleta, propietario no autorizado, ciclo, bloqueo de catálogo y rollback ante fallo de auditoría.
- `npm test --workspace frontend -- --include=src/app/process-workspace.component.spec.ts`: 4/4 pruebas correctas; recorren listado/ficha de lectura, creación, edición y reasignación, incluida la presentación de campos sin información y la ausencia de acciones de aprobación.
- `npm run docs:openapi --workspace backend`: correcto. Se comprobaron las rutas del incremento, autenticación de sesión, tipos de parámetros/DTO y ausencia de rutas de aprobación.
- `npm run db:migrate --workspace backend`, ejecutado dos veces consecutivas: ambas ejecuciones terminaron con código 0. La segunda no aplicó cambios pendientes. La migración `CreateProcessDrafts1740000000004` figura en el historial Oracle.
- Consulta Oracle de solo lectura: existen `PROCESS` y `PROCESS_VERSION` con claves foráneas validadas; el usuario de ejecución tiene únicamente SELECT/INSERT/UPDATE en ambas tablas y SELECT sobre la secuencia. No se encontraron privilegios DELETE ni grants delegables para esos objetos.

La prueba Oracle deja dos procesos de verificación y sus registros de auditoría en el esquema local; son datos sintéticos. No se hizo una revisión visual manual en navegador. La recreación desde cero en un esquema de pruebas separado no se ejecutó: PT-05 permanece pendiente. La revisión registrada exigida por PT-03 y las verificaciones de liberación siguen pendientes; estos resultados no las sustituyen.
