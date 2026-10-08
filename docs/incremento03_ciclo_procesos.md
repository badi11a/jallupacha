# Incremento 3 — Ciclo de revisión, versiones e historial

Estado: propuesta documental para revisión del responsable; no autorizada todavía para implementación. Concreta REQ-07, REQ-09 y REQ-56 de `docs/especificacion.md`, junto con sus dependencias REQ-05, REQ-06 y REQ-26. No modifica v13 ni sustituye el incremento 2.

## Alcance

Preparar el ciclo de envío a revisión, aprobación y rechazo; consulta del historial por el dueño responsable; edición versionada de procesos Vigentes; retiro por Administrador; y descarte lógico de Borradores que nunca fueron Vigente. Se preservan los cuatro estados fijos de v13: `Borrador`, `En revisión`, `Vigente` y `Obsoleto`.

No se añaden aprobaciones múltiples, nuevas etapas/estados, devolución adicional, motivos para aprobar o retirar, notificaciones, archivos, permisos nuevos, ni otros flujos no indicados por v13. La pantalla y sus controles reutilizarán el kit existente en `frontend/src/app/shared/ui/`, importándolo por su `index.ts`; no se reemplaza, duplica ni amplía el kit en este incremento. La interfaz seguirá sin constituir un control de acceso.

## Comportamiento requerido

### Envío y decisión

- El dueño responsable envía un `Borrador` a `En revisión`. Para enviarlo, el proceso tiene nombre, macroproceso y tipo, como establece REQ-05. No se endurecen aquí las reglas para guardar un Borrador incompleto.
- Solo un Administrador aprueba o rechaza una versión `En revisión`. Una aprobación basta; se conserva el identificador interno del Administrador y la fecha/hora de aprobación. También se admite que apruebe un proceso que editó el mismo Administrador; la aprobación queda en auditoría.
- Aprobar cambia la versión revisada a `Vigente`. Si reemplaza una versión vigente, esta se conserva en el historial y la nueva pasa a regir.
- Rechazar exige un motivo no vacío y devuelve la versión a `Borrador`. El motivo queda visible para el dueño y conservado en el historial/auditoría. No se inventan longitud, formato ni catálogo de motivos.
- Un rechazo no elimina la versión ni sus cambios. Una nueva edición/envío sigue sujeta a la aclaración de versionado pendiente de revisión indicada abajo.

### Edición de Vigente y vigencia efectiva

- Al editar un proceso `Vigente`, el dueño responsable crea una nueva versión `Borrador`; la versión `Vigente` continúa rigiendo hasta que se apruebe la nueva.
- La aprobación activa la nueva versión como vigente y conserva las versiones previas en el historial; no se reescribe ni elimina su contenido histórico.
- El código de proceso, la responsabilidad vigente y los permisos de REQ-05/REQ-26 siguen las reglas del incremento 2. La gestión del historial no habilita editar procesos ajenos.

### Historial

- El dueño responsable ve cada versión con fecha, usuario y qué cambió. Incluye las modificaciones de ficha y los eventos de envío, rechazo, aprobación, retiro y descarte pertinentes al ciclo.
- Se guarda el ID interno del actor y la fecha/hora; el nombre visible se resuelve al consultar la identidad vigente, sin copiar nombre/correo a registros inmutables.
- Las diferencias de ficha se muestran como cambios de campos y valores antes/después, escapados por Angular; los eventos de estado incluyen motivo de rechazo cuando corresponda. No se promete mostrar acciones que no hayan sido registradas.
- Solo la autorización del servidor decide si quien consulta es responsable actual del proceso. Ocultar el acceso en la interfaz no reemplaza el control.

### Retiro y descarte

- Solo Administrador puede marcar un proceso `Vigente` como `Obsoleto`; equivale a desactivarlo. Se conserva proceso, versiones e historial; no se borra físicamente ningún registro.
- El dueño responsable puede descartar un `Borrador` que nunca fue `Vigente`. Se desactiva lógicamente y queda registro; no se introduce un estado nuevo.
- Retirar un proceso o descartar un borrador no altera ni borra las versiones previamente conservadas.

## Transiciones

| Estado de versión | Acción | Actor | Resultado especificado |
| --- | --- | --- | --- |
| Borrador | Enviar a revisión; nombre, macroproceso y tipo presentes | Dueño responsable | En revisión |
| En revisión | Aprobar | Administrador | Vigente; registrar actor y fecha/hora |
| En revisión | Rechazar con motivo | Administrador | Borrador; motivo visible al dueño |
| Vigente | Aprobar una nueva versión | Administrador | La nueva versión pasa a Vigente; la anterior se conserva en historial |
| Vigente | Marcar Obsoleto | Administrador | Obsoleto y proceso desactivado |
| Borrador nunca Vigente | Descartar | Dueño responsable | Desactivado lógicamente, conservado sin borrado físico |

No se admiten transiciones no enumeradas por v13. Las versiones archivadas no reciben un quinto estado para indicar que dejaron de ser la vigente efectiva; hace falta resolver cómo se representan junto con la regla de estado fijo.

## Permisos

| Operación | Actor permitido |
| --- | --- |
| Enviar Borrador a revisión | Dueño responsable del proceso |
| Aprobar o rechazar En revisión | Administrador; incluye aprobar el proceso que él mismo editó |
| Consultar historial | Dueño responsable del proceso, conforme REQ-09 |
| Crear versión Borrador desde Vigente | Dueño responsable, conforme REQ-05; Administrador conserva la facultad general de edición de REQ-26 |
| Marcar Vigente Obsoleto | Administrador |
| Descartar Borrador nunca Vigente | Dueño responsable |

Cada solicitud vuelve a consultar sesión, perfiles vigentes, responsabilidad, estado y revisión en el servidor. Sesión ausente: 401; perfil/responsable no autorizado: 403; estado o revisión incompatible: 409; entidad/versión inexistente: 404. Las mutaciones requieren protección CSRF. La matriz no otorga al Administrador envío o descarte en nombre del dueño, pues REQ-07/56 no lo especifican; tal necesidad requeriría una decisión explícita.

## Modelo Oracle mínimo propuesto

La migración será nueva y versionada; no se altera la migración 0004 del incremento 2 ni se cambia `synchronize: false`.

- Ampliar `PROCESS_VERSION.STATUS` para aceptar únicamente los cuatro estados de v13, sustituyendo de forma versionada la restricción actual que solo permite `Borrador`.
- Conservar en cada versión el número, contenido, revisión técnica y estado. Añadir autor y fecha de creación, más aprobador y fecha de aprobación (nulos hasta aprobar), con FKs a usuario y fechas Oracle apropiadas.
- Distinguir sin ambigüedad la versión efectiva vigente de la versión de trabajo. Propuesta técnica: referencia nullable `PROCESS.EFFECTIVE_VERSION_ID` hacia `PROCESS_VERSION`; nula antes de la primera aprobación y actualizada transaccionalmente al aprobar una versión nueva. Mantener separada la versión de trabajo para no sustituir prematuramente la versión vigente.
- Añadir un registro append-only `PROCESS_CHANGE` (o formalizar el modelo CambioProceso ya descrito en arquitectura): proceso, versión, actor interno, fecha/hora, acción/evento y diferencias de campos en formato estructurado. El motivo de rechazo se registra en el evento de rechazo. Este registro sirve a REQ-09; `AUDIT` existente sigue siendo el registro de auditoría administrativa y ambos se escriben dentro de la misma transacción.
- Añadir una marca de descarte lógico a la versión de trabajo, sin introducir estado. El borrador inicial descartado también deja inactivo el proceso. Si existe una versión efectiva Vigente mientras se descarta una versión nueva, conservar activo el proceso y desactivar solo el borrador. Esta propuesta requiere la confirmación indicada en “Decisiones pendientes”.
- Índices/FKs necesarios para buscar versiones por proceso, historial cronológico y referencias a actor. La cuenta de ejecución recibe solo permisos específicos necesarios; el historial es append-only (SELECT/INSERT, sin UPDATE/DELETE). No almacenar nombres ni correos en snapshots de auditoría/historial.

Antes de definir DDL, inspeccionar configuración e historial TypeORM efectivos, constraints/grants actuales y verificar efectos de migraciones, siguiendo AGENTS.md y C-002. No ejecutar `up()` directamente, no marcar migraciones aplicadas manualmente, no borrar datos ni editar una migración aplicada.

## API mínima propuesta

| Ruta | Regla |
| --- | --- |
| `POST /api/processes/:id/submit` | Dueño responsable envía el Borrador; requiere revisión técnica; valida nombre, macroproceso y tipo. |
| `POST /api/processes/:id/approve` | Administrador aprueba la versión En revisión; registra actor y fecha/hora. |
| `POST /api/processes/:id/reject` | Administrador rechaza En revisión; motivo obligatorio y conservado. |
| `GET /api/processes/:id/history` | Historial completo con versiones, fecha, actor y cambios; solo dueño responsable. |
| `POST /api/processes/:id/obsolete` | Administrador retira el proceso Vigente y lo desactiva. |
| `POST /api/processes/:id/discard-draft` | Dueño responsable descarta una versión Borrador que nunca fue Vigente. |
| `PATCH /api/processes/:id` | Si la versión editada está Vigente, crea una nueva versión Borrador y conserva la vigente; si está en Borrador, aplica las reglas del incremento 2. |

Todas las mutaciones llevan revisión/versionado suficiente para impedir decisiones sobre una versión distinta de la mostrada; la forma exacta del DTO se fija al cerrar las decisiones pendientes. Documentar DTO, respuestas, estados y seguridad de cada ruta en OpenAPI. Toda ruta autenticada tendrá política explícita y pruebas directas de autorización. No añadir endpoints para aprobación múltiple ni operaciones fuera del alcance.

## Transacciones y concurrencia

- En una única transacción Oracle, bloquear la fila de `PROCESS` y la versión objetivo, revalidar actor/perfiles, responsable, estado, revisión y pertenencia al proceso; luego aplicar transición, metadatos de usuario/fecha, cambio de versión efectiva, registro histórico y auditoría.
- Para aprobación, la misma transacción cambia la versión revisada a `Vigente`, conmuta `EFFECTIVE_VERSION_ID` y conserva la anterior. Dos decisiones concurrentes sobre una revisión antigua no pueden aprobar versiones distintas silenciosamente.
- Para rechazo, transición a `Borrador`, motivo y eventos se guardan juntos. Si falla el registro histórico o la auditoría, toda la decisión revierte.
- En retiro y descarte, cambio de actividad/estado y registros append-only se confirman o revierten conjuntamente. No usar borrado físico.
- Verificar bloqueo con revisión optimista; estado/revisión obsoletos devuelven 409. SQL parametrizado y valores de historial tratados como datos, nunca ejecutados ni renderizados como HTML.

## Criterios de aceptación focalizados

1. POST directo sin sesión devuelve 401; cada rol no permitido devuelve 403 aun llamando la API directamente. Revalidar perfiles vigentes por petición y CSRF en escrituras.
2. El dueño responsable puede enviar un Borrador incompleto solo después de aportar nombre, macroproceso y tipo; entradas que incumplen cada condición se rechazan sin cambio ni evento exitoso. Otros campos opcionales no se vuelven obligatorios.
3. Administrador aprueba En revisión, incluso si editó el proceso: queda Vigente con su ID y fecha/hora; AUDIT conserva la aprobación. Usuario no Administrador recibe 403.
4. Rechazar sin motivo vacío devuelve error y no altera estado ni historial. Rechazar con motivo retorna a Borrador; el responsable ve el motivo y el historial conserva actor/fecha.
5. Editar una versión Vigente deja intacta la versión efectiva y crea una Borrador nueva; antes de aprobar, la ficha sigue gobernada por la vigente; al aprobar, la nueva se hace efectiva y ambas aparecen en historial.
6. El historial del responsable muestra versiones y cambios con fecha/actor; un dueño ajeno no accede. Nombres se resuelven sin persistir PII en datos inmutables.
7. Administrador retira Vigente a Obsoleto e inactivo; otro perfil no puede hacerlo. Versiones e historial permanecen consultables según permisos.
8. El responsable puede descartar solo Borrador nunca Vigente: queda lógicamente desactivado, sin borrado. No puede descartar Vigente ni suplantar otra revisión.
9. Fallo inyectado al guardar historial o auditoría revierte la operación completa. Dos acciones concurrentes con revisión obsoleta no pierden datos ni crean dos decisiones efectivas.
10. Pruebas Oracle cubren persistencia, constraints, locks, rollback, historial y grants mínimos; pruebas HTTP cubren 401/403/404/409, DTO y llamadas directas; UI recorre envío, revisión, rechazo, versiones e historial usando el kit compartido. Registrar comandos/resultados y revisión PT-03. PT-05 requiere recreación en esquema vacío de pruebas antes de declarar la verificación.

## Decisiones que requieren revisión antes de implementar

v13 no define cómo se muestra el estado cuando una versión Vigente sigue rigiendo mientras existe otra Borrador o En revisión, ni qué estado conservará la versión Vigente anterior en el historial tras aprobar el reemplazo. No se introducirá un estado adicional: se propone usar la referencia explícita de vigencia efectiva y conservar los estados históricos, pero el significado visible de “estado del proceso” debe aprobarse.

También requieren confirmación: (a) retirar un proceso Vigente que tenga simultáneamente una nueva versión Borrador/En revisión; (b) si tras rechazo se vuelve a editar y reenviar la misma versión o se crea otro número de versión; y (c) descarte de una nueva versión Borrador cuando el proceso anterior continúa Vigente (la propuesta desactiva solo la versión de trabajo y conserva activo el proceso).

La definición técnica de “qué cambió” propuesta es una diferencia por campo entre revisiones del Borrador, junto con eventos de transición; revisión del responsable necesaria antes de implementar. El documento no aprueba por sí solo las decisiones anteriores ni amplía los requisitos.
