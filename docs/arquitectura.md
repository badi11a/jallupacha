# Arquitectura mínima y decisiones

Revisión documental C-001 v4: Oracle 26ai Free en el entorno local, sin Docker. Distingue producto, entorno local y datos de prueba; sustituye las versiones anteriores.

## Restricciones confirmadas

TypeScript y Angular; backend NestJS; destino on-premise. El entorno local usa datos de prueba. Oracle AI Database 26ai Free instalado directamente en el computador local, sin Docker. Desarrollo directamente sobre Oracle; despliegue posterior en Oracle institucional. Google Workspace no disponible todavía.

## Componentes

- Angular: interfaz interna de perfiles, catálogos, fichas y revisión de procesos, árbol, búsqueda, historial, auditoría y alertas.
- NestJS: una API HTTP JSON bajo /api, autorización y reglas de negocio. Organizar por identidad, estructura, procesos/versiones, consulta, auditoría y seguridad; no crear servicios distribuidos.
- Oracle 26ai Free: persistencia, restricciones y transacciones mediante TypeORM.
- Sesiones: persistidas en Oracle 26ai Free para invalidación y expiración; cookie HttpOnly, SameSite y Secure bajo HTTPS. Proxy HTTPS del despliegue definitivo por concretar.

Angular nunca accede directamente a la base. API y frontend usan el mismo origen mediante proxy de desarrollo. La aplicación del entorno local solo escucha en localhost. La base del entorno local se utiliza únicamente con datos de prueba y su acceso se restringe al equipo de desarrollo.

## Modelo inicial

- Usuario: identificador interno, identidad institucional separada y estado.
- Identidad: usuario, nombre, correo y asociación al proveedor; las identidades precargadas son datos de prueba del entorno local.
- Perfil y UsuarioPerfil: los cuatro perfiles fijos y asignaciones múltiples con clave única compuesta.
- ControlAdministradores: una fila usada para serializar mutaciones del perfil Administrador.
- Macroproceso: identificador, código único inmutable, nombre, descripción, orden y activo.
- TipoProceso: identificador, nombre y activo.
- Auditoria: identificador, fecha UTC, actor interno, acción, tipo/id de entidad y valores antes/después sin datos identificativos personales.
- Sesion: referencia de usuario, hash del identificador aleatorio, última actividad y expiración. Nunca registrar el valor de la cookie.

- Proceso: ID interno, código único, propietario vigente, referencia a versión vigente y desactivación.
- VersionProceso: ID, proceso, número de versión, estado, macroproceso, tipo, campos de ficha, revisión técnica, autor/fecha y aprobación o rechazo. Referencias a catálogos con claves foráneas. Datos de historial conservados sin borrar versiones.
- CambioProceso: versión, fecha, actor interno y cambios sin datos identificativos personales.
- Riesgo: proceso asociado mediante FK; descripción, causa, consecuencia, referencia a tipo de riesgo y referencia obligatoria a nivel configurable (REQ-10/11). Sin tratamiento ni workflow de riesgos en Release 01.
- TipoRiesgo y NivelRiesgo: catálogos configurables por Administrador; incluyen inicialmente las categorías Operacional, Estratégico, Cumplimiento, Tecnológico, Financiero y niveles Bajo, Medio, Alto, Crítico. Un valor usado se desactiva, no se borra. El catálogo de tipos de documento de REQ-28 también es configurable; no implica incorporar carga/asociación de documentos.
- EventoSeguridad: fecha, actor interno opcional, referencia separada a IP, evento y resultado. IP anonimizable sin alterar evidencia no identificativa.
- AlertaSeguridad: usuario interno, intervalo y fecha; visible solo a Administrador.

No crear tablas de documentos, unidades ni relaciones mientras sus funciones estén fuera de alcance. La transcripción literal de REQ-10/11/28 está en `docs/especificacion.md`; las entidades/listas Oracle adicionales se incorporan solo mediante migraciones nuevas y con grants mínimos.

## Interfaces necesarias

- GET /api/me; POST /api/auth/demo/session; POST /api/auth/logout.
- GET /api/users; PUT /api/users/:id/profiles, solo Administrador y con restricciones de REQ-26.
- GET/POST /api/macroprocesses; PATCH /api/macroprocesses/:id; POST /api/macroprocesses/:id/deactivate.
- GET/POST /api/process-types; PATCH /api/process-types/:id; POST /api/process-types/:id/deactivate.
- GET /api/audit, solo Administrador, con paginación limitada.

Lectura de catálogos para usuarios autenticados; creación, edición y desactivación de macroprocesos y tipos solo Administrador. Esta restricción se limita a los catálogos. El endpoint /api/auth/demo/session se habilita únicamente bajo los controles documentados. Usar DTO validados y OpenAPI generado, con pruebas de políticas de cada ruta. 400 para entrada inválida, 401 sin autenticación, 403 sin permiso y 409 para conflictos de estado o concurrencia.

- Incremento 2: GET/POST /api/processes; GET/PATCH /api/processes/:id; PATCH /api/processes/:id/owner. La ficha y el listado requieren sesión; mutaciones requieren los perfiles definidos en su contrato.
- Propuesta Incremento 3, pendiente de revisión: GET /api/processes/:id/history y POST /api/processes/:id/obsolete y /discard-draft, según actor y estado. Enviar ID de versión y revisión técnica en mutaciones. El documento `incremento03_ciclo_procesos.md` registra alcance, controles y decisiones por confirmar antes de implementar. Las rutas REQ-07 se asignan al Release 01 y no se duplican aquí.
- Release 01: `GET /api/process-map` requiere sesión y devuelve jerarquía Macroproceso → tipo → procesos con estado, incluidos Borradores. `GET /api/processes/:id` obtiene la ficha completa existente con autorización de lectura.
- Release 01: `GET/POST /api/processes/:id/risks`; lectura permitida al Administrador/Gestor de riesgos y al dueño actual de ese proceso; crear solo Gestor de riesgos. `GET /api/risk-types` y `GET /api/risk-levels` para perfiles autorizados; gestión de listas solo Administrador. Cada petición consulta perfiles actuales. Consulta recibe 403 al llamar directamente.
- Reset/carga locales son comandos explícitos fuera del tráfico HTTP normal. Migran mediante TypeORM y crean Borradores y riesgos genéricos; no alteran estados por fuera del flujo aprobado.
- REQ-07 y las interfaces/mapas/exportaciones públicas REQ-17/36/52 están postergados. No crear endpoint anónimo para mapa.
- GET /api/search con paginación y límite, según su requisito y alcance posterior.
- GET /api/security-alerts, GET /api/users/:id/personal-data y POST /api/users/:id/anonymize, solo Administrador.
- GET /api/auth/google y callback para el mecanismo institucional; se implementan cuando exista configuración Google autorizada. Validar identidad y dominio en el servidor.

## Persistencia y compatibilidad

TypeORM con driver Oracle; synchronize: false. Migraciones versionadas y cuenta distinta con permisos de cambio de esquema. La cuenta de ejecución no altera esquema ni borra auditoría.

Usar el driver Oracle de TypeORM con node-oracledb. Conexión definida por ambiente mediante host, puerto, servicio, usuario y contraseña; ningún secreto se versiona. Usuario/esquema dedicado para la aplicación, sin usar SYS/SYSTEM. Separar permisos de ejecución y migraciones.

Identificadores numéricos generados por secuencias Oracle. Fechas de eventos en UTC. Valores antes/después como JSON serializado en CLOB, validado en la aplicación. Banderas persistidas con NUMBER(1) y restricción 0/1; no depender del BOOLEAN SQL reciente. Considerar que Oracle trata las cadenas vacías como NULL en validación y consultas. Definir longitudes y nulabilidad explícitas en entidades y migraciones.

Pruebas de restricciones, transacciones, bloqueos y concurrencia se ejecutan en Oracle real. Evitar funciones recientes o exclusivas de edición que no sean necesarias. No asumir compatibilidad con la versión institucional desconocida: antes del despliegue recrear el esquema y ejecutar pruebas contra esa versión. La transferencia a la base institucional usa migraciones versionadas y, si corresponde, un procedimiento explícito de traslado de datos; no copiar automáticamente la base local.

## Ejecución y pruebas

Angular y NestJS se ejecutan con Node.js/npm en el equipo local, conectados a la instalación nativa de Oracle 26ai Free. Documentar instalación, configuración, creación del esquema, aplicación de migraciones y carga de datos de prueba para reproducir el entorno local desde cero. Restablecimiento de datos de prueba explícito y restringido al esquema local de pruebas, sin afectar otros esquemas. Docker y Docker Compose no forman parte del entorno acordado. Las versiones de runtime y dependencias se registran en los manifiestos y el lockfile del proyecto; no cambiarlas arbitrariamente durante generación con IA.

Pruebas unitarias de reglas, integración Oracle 26ai Free de restricciones/transacciones y concurrencia, API de autorización y pruebas funcionales Angular. CI ejecuta las verificaciones exigidas por PT-03, PT-08, PT-11 y PT-12. El incremento 1 está implementado. Registrar por separado la evidencia efectiva de CI y pruebas, sin presumir su ejecución.

## Decisión aprobada de diseño — Incremento 2 (REQ-05/REQ-06)

El documento `incremento02_REQ05_REQ06_v1_1228.md` delimita el incremento aprobado y no modifica la planilla v13. La primera entrega crea una fila `PROCESS` con responsable asignado al creador y una única fila `PROCESS_VERSION` numerada 1 y en estado `Borrador`; `CURRENT_VERSION_ID` apunta a esa versión. El código PR se genera en servidor mediante secuencia Oracle. `REVISION` comienza en 1 y se incrementa en cada edición de ficha o reasignación. Macroproceso y tipo son referencias obligatorias a catálogos activos; los campos opcionales vacíos se persisten como NULL. Los identificadores de propietario, estado y código no se aceptan en la edición de ficha.

La API usa DTO explícitos y una lista paginada sin filtros avanzados. Sesión y perfiles vigentes se verifican por el guard en cada petición. Solo Dueño de proceso y Administrador pueden crear; el responsable con perfil Dueño o Administrador puede editar; solo Administrador puede reasignar a usuario activo con perfil Dueño. La lectura exige autenticación, no un perfil específico. Reasignación es una operación separada. Edición y reasignación exigen revisión optimista; discrepancia devuelve 409. Las escrituras de proceso, versión y auditoría comparten una transacción. Las mutaciones que refieren catálogos bloquean sus filas mientras verifican vigencia; desactivación bloquea la misma fila y consulta procesos activos antes de cambiar el catálogo.

Las referencias padre se almacenan en la versión y se validan contra procesos existentes; su modificación serializa la comprobación de ancestros para rechazar autorreferencias y ciclos. Esta estructura no crea relaciones de unidad ni diagramas. La ficha muestra todos los campos, el estado y el responsable vigente; unidades internas y modelo BPMN se presentan como `Sin información`, sin asociación ni carga. La migración versionada crea solo `PROCESS`, `PROCESS_VERSION`, la secuencia necesaria, restricciones/índices y grants mínimos de ejecución sobre esos objetos. Se mantiene `synchronize: false`.

Este incremento no implementa envío a revisión, aprobación, rechazo, historial visible, retiro, archivos, asociación de unidades, árbol, búsqueda ni filtros avanzados. No añade estados ni permite que el cliente altere código, propietario o estado.

## Decisiones postergadas

Versión y edición de Oracle institucional, infraestructura institucional, integración Google y dominio permitido, proxy definitivo y almacenamiento de archivos. No afectan a preparar el incremento local, pero las decisiones pertinentes deben documentarse antes de construir cada función o desplegarla.

## Diseño — Release 01: mapa interno y riesgos

El documento `release01_navegable.md` define el alcance vigente y los contratos que consumirá la vista. Reutiliza la ficha, estructura de procesos y kit UI existente. `GET /api/process-map` es autenticado y devuelve la jerarquía completa, agrupación por tipo y estado, incluyendo Borradores; el cliente navega a `GET /api/processes/:id` para la ficha completa. El servidor no filtra Borradores ni concede acceso por interfaz: cada endpoint comprueba la sesión y los perfiles actuales.

Riesgo tiene FK a proceso y referencias a catálogos configurables de tipo/nivel. Contiene descripción, causa, consecuencia, tipo y nivel obligatorio. Niveles iniciales: Bajo, Medio, Alto, Crítico. Gestor de riesgos registra; dueño consulta sus procesos; Administrador administra listas y puede supervisar; Consulta y dueños ajenos no consultan. Reglas de permisos en servidor por recurso y llamada.

El contrato está detallado en `release01_navegable.md`: lectura de mapa, ficha y riesgos, creación de riesgo, y consulta de catálogos de riesgo. Las rutas usan sesión y errores 401/403/404/400/409 coherentes. El UI kit de `frontend/src/app/shared/ui/` se conserva y solo se importa por su API pública.

El comando local de restablecimiento valida explícitamente ambiente, loopback y esquema local autorizado antes de DDL, aplica migraciones versionadas con la ruta TypeORM normal y luego carga JSON genérico idempotente: contenido de procesos distribuido en los tres macroprocesos existentes y al menos un riesgo por proceso, sin datos reales ni etiquetas de desarrollo visibles. No apunta a Oracle institucional, no altera migraciones aplicadas y no asigna estado más allá de Borrador.

REQ-07 y REQ-17/36/52 quedan postergados: no implementar transición de aprobación/rechazo, mapa/exportación pública ni endpoint anónimo. REQ-56 queda fuera: no editar ni alterar procesos Vigentes directamente. Mantener `synchronize: false`, grants mínimos y auditoría existente.

## Propuesta de diseño — Incremento 3: historial y versiones (REQ-09/REQ-56)

La especificación del incremento 3 está en revisión y no autoriza implementación. El flujo REQ-07 de envío, aprobación y rechazo corresponde al Release 01; el alcance futuro de esta sección se limita al historial REQ-09 y a las capacidades de versiones/retiro/descarte de REQ-56. Se conservan los estados fijos de v13: `Borrador`, `En revisión`, `Vigente` y `Obsoleto`; no se incorporan estados ni pasos de aprobación nuevos.

La implementación deberá versionar una edición de Vigente como Borrador sin sustituir la versión efectiva antes de aprobar. Para ello se propone una referencia explícita a versión efectiva en `PROCESS`, metadatos internos de autor/fecha en `PROCESS_VERSION` y un registro append-only `PROCESS_CHANGE` para diferencias y eventos. `AUDIT` sigue registrando las decisiones administrativas. Cambios de estado, version efectiva, historial y auditoría son una sola transacción Oracle bajo bloqueo de proceso/versión y revisión optimista. El descarte es lógico, sin borrado físico. DDL se introduce mediante migración nueva; nunca editar migraciones aplicadas, modificar historial manualmente ni ejecutar `up()` fuera del comando normal.

La semántica de estado mientras coexisten una Vigente efectiva y otra versión de trabajo, retiro con versión pendiente, reenvío después de rechazo y descarte de esa versión requieren aprobación antes de construir. Las alternativas y aceptación de producto pendientes están detalladas en `incremento03_ciclo_procesos.md`; no asumirlas desde la arquitectura. Se mantiene `synchronize: false`, grants de mínimo privilegio y autorización recalculada en cada solicitud.

La interfaz de este ciclo reutilizará `frontend/src/app/shared/ui/` por su API pública actual. Esta propuesta no reemplaza ni cambia la decisión del kit compartido, su frontera sin reglas de dominio, ni sus componentes y estilos existentes.

## Modelo de verificación transversal

Sesiones con expiración por inactividad de 30 minutos, cierre explícito e invalidación. Protección CSRF en escrituras, validación de DTO y escape de salida. Límite configurable por origen con 429 sin bloquear a usuarios de otros orígenes; valores concretos de límites se fijan y verifican con la prueba de carga. Cabeceras CSP/HSTS para HTTPS y errores sin detalles internos.

Respaldo diario de base de datos con cuenta específica, ubicación separada y control de acceso/cifrado; restaurar en instancia aislada antes de producción. El entorno local HTTP no valida REQ-30 ni HSTS. No excluirlos del alcance.

La autenticación local de desarrollo, el dominio Google pendiente y la versión Oracle institucional son restricciones técnicas registradas, no preguntas abiertas de requisitos. No modificar la planilla.

## Cuentas y permisos Oracle

Usar dos cuentas distintas en el servicio/PDB local:

- Propietaria del esquema: crea objetos y aplica migraciones. Sus credenciales no se usan en el proceso normal del backend.
- Ejecución: sin objetos propios ni privilegios DDL; recibe CREATE SESSION y permisos específicos sobre objetos del esquema propietario. Referenciar el esquema explícitamente en TypeORM.

La cuenta de ejecución recibe SELECT/INSERT sobre Auditoria, CambioProceso y EventoSeguridad, sin UPDATE/DELETE. Las asociaciones identificativas y las IP se guardan en tablas separadas; estas sí admiten los cambios necesarios para REQ-49. No colocar datos personales identificativos en el contenido inmutable. Otorgar los permisos de actualización de negocio y gestión de sesiones únicamente sobre sus tablas respectivas. No usar SYS/SYSTEM para ejecutar la aplicación.

Verificación: una prueba conectada como cuenta de ejecución intenta modificar/borrar auditoría y recibe rechazo de Oracle; otra comprueba anonimización de identidad e IP sin alterar auditoría/historial. La cuenta propietaria es administrativa y se protege fuera del acceso de la aplicación; la restricción de ejecución no implica inmunidad frente a administradores de base.

## Políticas de autorización por operación

| Operación | Permiso y condición |
| --- | --- |
| Leer ficha, árbol y búsqueda | Cualquier usuario autenticado, sin añadir filtro obligatorio por estado. |
| Crear proceso | Dueño de proceso. Administrador puede realizar carga inicial conforme REQ-26 y el perfil descrito en Inicio. |
| Editar proceso | Dueño responsable del proceso o Administrador. |
| Reasignar responsable | Administrador; destino con perfil Dueño de proceso. PATCH /api/processes/:id/owner. |
| Enviar Borrador a revisión | Dueño responsable. |
| Aprobar/rechazar En revisión | Administrador; rechazo requiere motivo. |
| Marcar Vigente Obsoleto | Administrador. |
| Descartar Borrador contemplado por REQ-56 | Dueño responsable; desactivación sin borrado físico. |
| Leer historial del proceso | Dueño responsable, conforme REQ-09. |
| Administrar perfiles y catálogos | Administrador, respetando las restricciones originales. |
| Consultar auditoría/alertas y gestionar derechos personales | Administrador. |

Una persona con varios perfiles obtiene las facultades de cada uno; ser Administrador no convierte automáticamente a la persona en dueño responsable. Todas las comprobaciones se ejecutan en el servidor, incluida pertenencia del ID de versión al proceso. Pruebas directas de API cubren cada ruta con actor autorizado y no autorizado.

## Autenticación local de desarrollo

Desactivada por defecto. La autenticación local de desarrollo solo se habilita con AUTH_MODE=demo y NODE_ENV=development; rechazar el arranque si AUTH_MODE=demo bajo otro entorno o con dirección de escucha distinta de loopback. Frontend y backend accesibles únicamente desde el equipo local; no habilitar túneles ni publicar este modo.

El selector solo ofrece identidades de prueba precargadas; el servidor comprueba su pertenencia a la semilla y no acepta perfiles enviados por el cliente. Crear sesión de servidor, proteger escrituras contra CSRF, cerrar e invalidar sesión y aplicar 30 minutos de inactividad. Mostrar un único aviso discreto de acceso local, conforme a “Presentación del producto”, en docs/especificacion.md.

Pruebas automáticas de arranque inválido, identidad ajena a la semilla, perfiles falsificados, cierre y expiración. La autenticación local de desarrollo no satisface REQ-25 ni se distribuye como autenticación institucional.

## Instalación reproducible prevista

La implementación debe mantener estos pasos reproducibles y documentar los comandos concretos en docs/instalacion-windows.md:

1. Instalar Oracle 26ai Free local y las versiones fijadas de Node.js y herramientas del proyecto. Registrar versión exacta y requisitos del equipo.
2. Conectar al servicio/PDB de desarrollo; crear las cuentas propietaria y de ejecución con cuota y permisos mínimos. El script administrativo se ejecuta por un operador autorizado, no por el backend.
3. Configurar conexión mediante archivo local excluido de Git y proporcionar .env.example sin secretos. Nunca compartir contraseñas en documentación o CI.
4. Instalar dependencias mediante npm ci y aplicar migraciones con la cuenta propietaria, sin synchronize.
5. Ejecutar semilla idempotente: cuatro perfiles y macroprocesos Estratégicos, Misionales y de Apoyo en ese orden. La carga de datos de prueba es explícita y separada, crea usuarios de prueba y Administrador inicial sin sobrescribir cuentas existentes.
6. Arrancar backend y frontend en loopback. Verificar conexión, sesión local de prueba, permisos y persistencia tras reinicio.
7. Restablecer únicamente el esquema local de pruebas bajo un comando explícito con comprobación de ambiente y destino. Nunca restablecer automáticamente al arrancar ni apuntar al esquema institucional.

PT-04/PT-05 se verifican reproduciendo estos pasos sobre un esquema limpio. La instalación Oracle local no se borra como parte del restablecimiento.

## Lugar de ejecución de pruebas

Las pruebas de integración y concurrencia usan un esquema Oracle de pruebas dedicado en el computador local; nunca datos de producción ni el esquema de uso normal. Registrar comando, commit, versión Oracle y resultado antes de integrar cambios afectados.

La CI ejecuta comprobaciones estáticas, pruebas independientes de Oracle, SAST, secretos y dependencias. No conectar un runner público a la base institucional ni afirmar que la CI prueba Oracle si no tiene instancia asignada. Las pruebas Oracle locales con evidencia y revisión satisfacen la modalidad inicial de PT-03; ampliar automatización posteriormente sin cambiar las reglas del producto.

## Catálogos y versiones

Para REQ-04 y REQ-51 contar IDs de proceso distintos: un proceso activo referencia un catálogo si lo usa su versión Vigente o su versión de trabajo activa (Borrador/En revisión). No contar versiones históricas ni procesos Obsoletos o borradores descartados.

Crear o cambiar referencias exige catálogos activos. Las versiones históricas pueden conservar referencias a catálogos desactivados: no se reescribe el historial. Al aprobar, comprobar de nuevo los catálogos de la versión. La desactivación y las mutaciones de referencias comparten bloqueo transaccional para impedir carreras.

## Interfaz: kit de componentes compartidos

Decisión de diseño técnico; no modifica requisitos de v13 ni el alcance funcional. Los elementos de interfaz generales viven en `frontend/src/app/shared/ui/` y se exponen solo mediante `frontend/src/app/shared/ui/index.ts`. Se construyen dentro de esta aplicación y se usan primero aquí; la extracción posterior a una librería Angular reutilizable por otros desarrollos institucionales requiere otra decisión documentada en este archivo, sin cambiar este contrato público.

Contenido de la primera entrega:

- Tokens de diseño como propiedades CSS `--ui-*` (color, tipografía, espaciado, radios, sombras y foco) y estilos base de elementos, botones, formularios, tablas y mensajes. Sin dependencias de terceros.
- Estructura común `ui-app-shell`: marca, cuenta y cierre de sesión, un único lugar para el aviso de entorno (conforme a “Presentación del producto”), contenido principal y pie.
- Componentes `ui-panel`, `ui-message`, `ui-pagination` y el servicio de diálogos (`UiDialogService`), que reemplaza `confirm()`/`prompt()` del navegador por un `<dialog>` nativo, modal y accesible, con validación de campos en el cliente.

Reglas de frontera:

- `shared/ui` no importa código de `app/` fuera de su carpeta, no llama a la API y no contiene textos, perfiles ni reglas del dominio de procesos. Todo texto visible del producto se entrega por entradas o contenido proyectado.
- Los textos predeterminados del kit son etiquetas funcionales neutras en español; no se usa terminología de entorno.
- El kit no realiza control de acceso. Ocultar o deshabilitar un elemento no sustituye la autorización del servidor (PT-07). La validación del diálogo es de usabilidad; el servidor sigue validando toda entrada (PT-08).
- Los textos se muestran mediante interpolación de Angular; el kit no usa `innerHTML` ni omite la sanitización.

Verificación: pruebas de componente del kit (`shared/ui/*.spec.ts`) y pruebas funcionales de la aplicación que recorren confirmación y edición mediante diálogo.

### Identidad visual y accesibilidad

Decisión de diseño técnico tomada a partir de un prototipo de referencia no obligatorio: se adoptan su paleta (azul marino y azul), sus radios y sus sombras. Su navegación de portal, sus contenidos y sus funciones no implementadas no se adoptan; estas últimas siguen el alcance de la especificación y del release aprobado.

- Tipografía: fuentes del sistema (`system-ui` y equivalentes). No se cargan fuentes ni otros recursos desde orígenes externos, para mantener la CSP restrictiva (PT-10) y no exponer a los usuarios ante terceros. Alojar una fuente propia requiere otra decisión.
- Accesibilidad de referencia: WCAG 2.2 nivel AA. Los tonos del prototipo que no alcanzan el contraste exigido se oscurecen dentro de la misma familia. El texto base es de 16 px y ningún texto baja de 12 px.
- Los colores del kit se definen solo como tokens `--ui-color-*` en hexadecimal de 6 dígitos. `npm run check:contrast --workspace frontend` verifica cada combinación usada (texto 4,5:1; bordes de controles y foco 3:1) y falla si alguna no cumple. Una combinación nueva se agrega al script en el mismo cambio que la introduce.

## Interfaz: navegación por rutas

Decisión de diseño técnico; no modifica requisitos, API ni permisos. Cada pantalla del mapa interno y de procesos tiene una dirección propia mediante el router de Angular, para que funcionen Atrás y Adelante del navegador, la recarga y los enlaces directos. Las rutas del mapa y de riesgos implementan la vista del Release 01 ([release01_navegable.md](./release01_navegable.md)) con sus contratos de API:

| Ruta | Pantalla |
| --- | --- |
| `/` | Redirige a `/mapa`, entrada de la aplicación autenticada |
| `/mapa` | Mapa interno: macroprocesos en orden configurado, con cantidad de procesos y tipos |
| `/mapa/macroprocesos/:id` (`?agrupar=estado`) | Procesos del macroproceso, incluidos los Borradores, agrupados por tipo (predeterminado) o por estado |
| `/procesos` (`?pagina=N`) | Listado paginado |
| `/procesos/nuevo` | Creación de borrador |
| `/procesos/:id` | Ficha |
| `/procesos/:id/editar` | Edición de borrador |
| `/procesos/:id/riesgos` (`?pagina=N`) | Riesgos del proceso: consulta y registro según perfil |
| `/administracion/catalogos` | Catálogos: «Estructura» (macroprocesos) y «Clasificación» (tipos de proceso). Lectura para todo perfil; alta, edición y desactivación solo Administrador (C-008) |
| `/administracion/perfiles` | Perfiles de usuario. Solo Administrador (C-008) |
| `/administracion/auditoria` | Auditoría reciente. Solo Administrador (C-008) |
| otra | Página no encontrada, con enlace al listado |

- Corrección de diseño C-008 (sustituye el criterio anterior de mantener catálogos y administración en la misma página; la ubicación de «Perfiles de usuario» y «Auditoría reciente» la decidió el responsable del producto el 2026-10-08). Contenido común a toda ruta autenticada: marca, cuenta y cierre de sesión, saludo, navegación principal, aviso único de entorno (conforme a «Presentación del producto») y pie. Todo lo demás es contenido de la ruta. «Estructura» y «Clasificación» viven solo en `/administracion/catalogos`; «Perfiles de usuario» solo en `/administracion/perfiles`; «Auditoría reciente» solo en `/administracion/auditoria`. Se conservan sin cambio funciones (alta, edición y desactivación de catálogos con su validación y auditoría; asignación de perfiles con sus restricciones; consulta de auditoría con «Actualizar»), API y permisos. La navegación principal ofrece «Mapa de procesos», «Procesos» y «Catálogos» a todo perfil, y «Perfiles» y «Auditoría» solo a Administrador. Una dirección de administración abierta sin perfil Administrador muestra «La acción no está autorizada para este perfil.» y no llama a la API; el servidor sigue rechazando con 403 (PT-07). Cada pantalla carga sus propios datos al abrirse.
- La marca de la barra superior navega con el router a `/mapa` (sin recargar la aplicación) y respeta la protección de cambios sin guardar (C-008, R10).
- Las migas de pan de ficha, edición y riesgos siguen la jerarquía Mapa → Macroproceso → Proceso → Riesgos, no el historial de navegación.
- Una ruta no concede acceso. Sin sesión se muestra el acceso y, al iniciar sesión, se abre la dirección solicitada. Un ID inexistente, no numérico o sin permiso se informa con los mensajes existentes (404/403); el servidor sigue autorizando cada llamada (PT-07). Las acciones visibles siguen calculándose con los perfiles vigentes: la interfaz ofrece riesgos a Administrador, Gestor de riesgos y Dueño responsable, y el registro solo al Gestor; Consulta y dueños ajenos no solicitan riesgos.
- Las rutas de edición, creación y riesgos protegen los cambios sin guardar: se pide confirmación al navegar dentro de la aplicación (enlaces, Atrás o Adelante, cierre de sesión) y el navegador avisa al recargar o cerrar la pestaña. Al cancelar una navegación con Atrás o Adelante, la dirección visible se restablece. Si el área de contenido ya no existe (por ejemplo, tras cerrar sesión), la guarda no bloquea la navegación.
- Cada ruta declara un título; el documento muestra «<pantalla> · Sistema de Procesos Institucionales» (`provideUiNavigation` del kit), y «Acceso · …» sin sesión. Al cambiar de ruta, no solo de parámetros, el foco pasa al encabezado del contenido; una navegación nueva empieza arriba y Atrás/Adelante restaura la posición guardada de esa entrada (restauración nativa del navegador desactivada). La carga inicial no mueve el foco. Corrección C-007.
- La recarga de rutas profundas requiere que quien sirve el frontend responda `index.html` a toda ruta que no sea `/api` ni un archivo existente. En el entorno local lo hace `ng serve`. El proxy del despliegue definitivo, aún por concretar, debe aplicar la misma regla sin interceptar `/api`.

Verificación: pruebas funcionales de rutas (mapa, macroproceso y agrupación, listado, ficha, edición, creación, riesgos por perfil, paginación en la dirección, ID no numérico, ruta desconocida) y de la protección de cambios sin guardar. Para C-008: las rutas de procesos (mapa, macroproceso, listado, ficha, riesgos) no contienen los paneles «Estructura», «Clasificación», «Perfiles de usuario» ni «Auditoría reciente» y sí marca, cuenta, navegación y un solo aviso; cada pantalla de administración muestra solo sus paneles, una vez, con título y foco conforme a C-007; Administrador conserva alta, edición y desactivación de catálogos, asignación de perfiles y consulta de auditoría; los demás perfiles leen catálogos sin acciones, no ven «Perfiles» ni «Auditoría» en la navegación y, por dirección directa, reciben el mensaje de autorización sin llamar a la API; las llamadas directas sin perfil Administrador siguen rechazadas con 403; la marca navega sin recargar (R10). Revisión visual del Release 01 registrada en [release01_navegable.md](./release01_navegable.md).

## Separación de entorno y presentación — corrección documental C-001 v4

Los identificadores existentes de configuración/API se conservan por compatibilidad; no son textos de presentación. AUTH_MODE=demo, los endpoints y los marcadores internos no se renombran solo por motivos de presentación. Los textos visibles siguen la sección Presentación del producto, en [docs/especificacion.md](./especificacion.md).

Ajustar la semilla de nuevas instalaciones con nombres neutros. En instalaciones existentes, cualquier corrección de etiquetas se limita a identidades y registros inequívocamente identificados como semilla de desarrollo; no sobrescribir contenido editado por usuarios, no reiniciar perfiles ni borrar auditoría. Si se cambia un dato persistido, usar el mecanismo correspondiente, mantener idempotencia y registrar la modificación conforme a las reglas de auditoría.
